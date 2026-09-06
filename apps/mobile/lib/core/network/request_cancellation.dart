import 'package:dio/dio.dart';

/// Per-screen request cancellation helper.
///
/// A screen (or view model) owns one [RequestCanceller], passes its tokens
/// into Dio calls via `cancelToken:`, and calls [cancelAll] (typically from
/// `dispose`) so in-flight requests don't complete after the screen is gone.
///
/// ```dart
/// final canceller = RequestCanceller();
///
/// Future<void> load() async {
///   final res = await dio.get('/api/items',
///       cancelToken: canceller.tokenFor('items'));
/// }
///
/// @override
/// void dispose() {
///   canceller.cancelAll();
///   super.dispose();
/// }
/// ```
class RequestCanceller {
  final Map<String, CancelToken> _tokens = {};
  bool _disposed = false;

  /// Returns the live token for [key], creating one if needed.
  ///
  /// Throws [StateError] after [cancelAll]/[dispose].
  CancelToken tokenFor(String key) {
    if (_disposed) {
      throw StateError('RequestCanceller is already disposed.');
    }
    final existing = _tokens[key];
    if (existing != null && !existing.isCancelled) return existing;
    final token = CancelToken();
    _tokens[key] = token;
    return token;
  }

  /// Cancels the in-flight request for [key], if any.
  void cancel(String key, [Object? reason]) {
    _tokens.remove(key)?.cancel(reason);
  }

  /// Cancels every tracked request and releases all tokens.
  void cancelAll([Object? reason]) {
    for (final token in _tokens.values) {
      if (!token.isCancelled) token.cancel(reason);
    }
    _tokens.clear();
    _disposed = true;
  }

  /// Alias for [cancelAll].
  void dispose() => cancelAll();

  /// Whether any token is currently tracked.
  bool get isEmpty => _tokens.isEmpty;
}
