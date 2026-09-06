import 'package:dio/dio.dart';

/// Safe retry policy: idempotent GETs only, max 2 retries with exponential
/// backoff. POST/PUT/PATCH/DELETE are never auto-retried (a retry could
/// execute a write twice).
class SafeRetryPolicy {
  SafeRetryPolicy(
      {this.maxRetries = 2,
      this.baseDelay = const Duration(milliseconds: 300)});

  /// Maximum automatic retries per request (default 2 → up to 3 attempts).
  final int maxRetries;

  /// Base delay; attempt `n` (1-based) waits `baseDelay * 2^(n-1)`.
  final Duration baseDelay;

  /// Extra key tracking how many retries a request has already used.
  static const String retryCountKey = 'mob006_retry_count';

  /// Pure predicate used by [RetryInterceptor] and unit tests.
  ///
  /// Retries only when ALL hold:
  /// - HTTP method is GET (case-insensitive),
  /// - fewer than [maxRetries] retries used so far,
  /// - the failure looks transient (timeout, connection error, or 5xx),
  /// - the request was not cancelled.
  bool shouldRetry(
      RequestOptions request, DioException error, int retriesUsed) {
    if (request.method.toUpperCase() != 'GET') return false;
    if (retriesUsed >= maxRetries) return false;
    if (error.type == DioExceptionType.cancel) return false;
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
      return true;
    }
    final status = error.response?.statusCode;
    if (status != null && status >= 500) return true;
    // `unknown` without a response is usually a socket/DNS failure.
    if (error.type == DioExceptionType.unknown && error.response == null) {
      return true;
    }
    return false;
  }

  /// Delay before retry attempt [retryNumber] (1-based): base * 2^(n-1).
  Duration delayForAttempt(int retryNumber) {
    return baseDelay * (1 << (retryNumber - 1));
  }
}

/// Dio error interceptor applying [SafeRetryPolicy] with exponential backoff.
class RetryInterceptor extends Interceptor {
  RetryInterceptor(this._dio, [SafeRetryPolicy? policy])
      : _policy = policy ?? SafeRetryPolicy();

  final Dio _dio;
  final SafeRetryPolicy _policy;

  SafeRetryPolicy get policy => _policy;

  @override
  Future<void> onError(
      DioException err, ErrorInterceptorHandler handler) async {
    final request = err.requestOptions;
    final retriesUsed =
        (request.extra[SafeRetryPolicy.retryCountKey] as int?) ?? 0;

    if (!_policy.shouldRetry(request, err, retriesUsed)) {
      handler.next(err);
      return;
    }

    await Future<void>.delayed(_policy.delayForAttempt(retriesUsed + 1));
    try {
      final nextOptions = request.copyWith(
        extra: {
          ...request.extra,
          SafeRetryPolicy.retryCountKey: retriesUsed + 1,
        },
      );
      final response = await _dio.fetch<dynamic>(nextOptions);
      handler.resolve(response);
    } on DioException catch (retryErr) {
      handler.next(retryErr);
    }
  }
}
