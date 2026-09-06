import 'package:dio/dio.dart';

/// Typed classification of API failures.
///
/// [ApiException.fromDioException] is the single mapping point used by the
/// Dio error-interceptor path in [ApiClient]. It preserves the previous
/// message-surfacing behavior (server body `error`/`message` wins when
/// present) and falls back to a human-readable default per kind.
enum ApiErrorKind {
  /// Connect / send / receive timeout.
  timeout,

  /// No network route to the server (connection error, DNS, socket closed).
  noConnection,

  /// HTTP 401 — session expired or invalid.
  unauthorized,

  /// HTTP 403 — authenticated but not allowed.
  forbidden,

  /// HTTP 404 — resource not found.
  notFound,

  /// HTTP 422 — server-side validation failure.
  validation,

  /// HTTP 5xx — server failure.
  server,

  /// Request was cancelled via a [CancelToken].
  cancelled,

  /// Anything else (other 4xx, malformed responses, unexpected errors).
  unknown,
}

/// Typed API failure surfaced through the Dio error-interceptor path.
///
/// The interceptor keeps the human-readable string on
/// `DioException.message` (existing callers such as `AuthService` read that)
/// and stashes the typed [ApiException] on `DioException.error`.
class ApiException implements Exception {
  const ApiException({
    required this.kind,
    required this.message,
    this.statusCode,
    this.requestId,
  });

  /// The machine-readable classification.
  final ApiErrorKind kind;

  /// Human-readable message. Prefers the server body (`error`/`message`)
  /// when present, otherwise a per-kind default.
  final String message;

  /// HTTP status code when the failure came from a response.
  final int? statusCode;

  /// Correlation id (`x-request-id`) of the failed request, if any.
  final String? requestId;

  /// Maps a [DioException] to a typed [ApiException].
  ///
  /// Keeps existing message-surfacing behavior: a server-provided
  /// `error`/`message` string always wins over the built-in defaults.
  factory ApiException.fromDioException(DioException err) {
    final statusCode = err.response?.statusCode;
    final requestId = err.requestOptions.headers['x-request-id'] as String?;

    // Cancellation first: Dio reports it as its own type.
    if (err.type == DioExceptionType.cancel) {
      return ApiException(
        kind: ApiErrorKind.cancelled,
        message: _serverMessage(err) ?? 'Request was cancelled.',
        statusCode: statusCode,
        requestId: requestId,
      );
    }

    // Transport-level failures (no HTTP response at all).
    if (err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout) {
      return ApiException(
        kind: ApiErrorKind.timeout,
        message: _serverMessage(err) ??
            'The request timed out. Check your connection and try again.',
        statusCode: statusCode,
        requestId: requestId,
      );
    }
    if (err.type == DioExceptionType.connectionError ||
        (err.type == DioExceptionType.unknown && statusCode == null)) {
      return ApiException(
        kind: ApiErrorKind.noConnection,
        message: _serverMessage(err) ??
            'No internet connection. Please check your network and retry.',
        statusCode: statusCode,
        requestId: requestId,
      );
    }

    // HTTP-status mapping.
    final serverMessage = _serverMessage(err);
    switch (statusCode) {
      case 401:
        return ApiException(
          kind: ApiErrorKind.unauthorized,
          message: serverMessage ??
              'Your session has expired. Please sign in again.',
          statusCode: statusCode,
          requestId: requestId,
        );
      case 403:
        return ApiException(
          kind: ApiErrorKind.forbidden,
          message: serverMessage ?? 'You do not have permission to do that.',
          statusCode: statusCode,
          requestId: requestId,
        );
      case 404:
        return ApiException(
          kind: ApiErrorKind.notFound,
          message: serverMessage ?? 'The requested item was not found.',
          statusCode: statusCode,
          requestId: requestId,
        );
      case 422:
        return ApiException(
          kind: ApiErrorKind.validation,
          message: serverMessage ??
              'Some fields are invalid. Please review and retry.',
          statusCode: statusCode,
          requestId: requestId,
        );
    }
    if (statusCode != null && statusCode >= 500) {
      return ApiException(
        kind: ApiErrorKind.server,
        message: serverMessage ??
            'Something went wrong on our side. Please try again later.',
        statusCode: statusCode,
        requestId: requestId,
      );
    }

    return ApiException(
      kind: ApiErrorKind.unknown,
      message: serverMessage ?? 'Something went wrong. Please try again.',
      statusCode: statusCode,
      requestId: requestId,
    );
  }

  /// Convenience: map when the error is a [DioException], otherwise wrap.
  factory ApiException.from(Object error) {
    if (error is ApiException) return error;
    if (error is DioException) return ApiException.fromDioException(error);
    return ApiException(
      kind: ApiErrorKind.unknown,
      message: '$error',
    );
  }

  /// Server-provided message from the response body, if any.
  ///
  /// This is the pre-existing surfacing contract: `error` wins over
  /// `message`, both must be non-empty strings.
  static String? _serverMessage(DioException err) {
    final data = err.response?.data;
    if (data is Map) {
      final fromError = data['error'];
      if (fromError is String && fromError.isNotEmpty) return fromError;
      final fromMessage = data['message'];
      if (fromMessage is String && fromMessage.isNotEmpty) return fromMessage;
    }
    return null;
  }

  @override
  String toString() => 'ApiException($kind, $statusCode): $message';
}
