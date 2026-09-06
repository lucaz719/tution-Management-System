import 'dart:math';

import 'package:dio/dio.dart';

/// Generates and attaches a correlation id (`x-request-id`) to every
/// outgoing request so client errors can be traced in server logs.
///
/// A pre-existing `x-request-id` header is left untouched (callers and
/// tests may set their own). UUID v4 is generated with [Random.secure];
/// no extra dependency is required.
class CorrelationIdInterceptor extends Interceptor {
  CorrelationIdInterceptor({String Function()? idGenerator})
      : _idGenerator = idGenerator ?? generateRequestId;

  static const String headerName = 'x-request-id';

  final String Function() _idGenerator;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.headers.putIfAbsent(headerName, _idGenerator);
    handler.next(options);
  }

  /// UUID v4 string, e.g. `f47ac10b-58cc-4372-a567-0e02b2c3d479`.
  static String generateRequestId() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    // Version 4 + RFC 4122 variant bits.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-'
        '${hex.substring(12, 16)}-${hex.substring(16, 20)}-'
        '${hex.substring(20, 32)}';
  }
}
