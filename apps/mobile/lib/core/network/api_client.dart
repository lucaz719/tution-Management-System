import 'package:dio/dio.dart';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart';

/// Central API client for the TMS mobile app.
///
/// Uses Dio with a Better Auth session cookie jar. All backend calls should go
/// through [ApiClient.dio] so the httpOnly session cookie is sent automatically.
class ApiClient {
  ApiClient._();

  static final ApiClient _instance = ApiClient._();
  static ApiClient get instance => _instance;

  /// Set per build using `--dart-define=API_BASE_URL=<url>`.
  ///
  /// The debug default targets the Android emulator. Release builds must
  /// provide an HTTPS endpoint explicitly; a package must never be released
  /// with an emulator URL or clear-text API traffic.
  static String get _defaultBaseUrl {
    if (kIsWeb) return 'http://localhost:3001';
    return defaultTargetPlatform == TargetPlatform.android
        ? 'http://10.0.2.2:3001'
        : 'http://localhost:3001';
  }

  static const String _configuredBaseUrl = String.fromEnvironment('API_BASE_URL');

  static String get baseUrl =>
      _configuredBaseUrl.isNotEmpty ? _configuredBaseUrl : (kDebugMode ? _defaultBaseUrl : '');

  static const String userKey = 'tms_auth_user';
  static const String tenantKey = 'tms_tenant_id';

  late final Dio dio;
  bool _initialized = false;

  /// Initialize the client. Call once from main() before runApp.
  Future<void> init() async {
    if (_initialized) return;

    final resolvedUrl = baseUrl;
    final endpoint = Uri.tryParse(resolvedUrl);
    if (endpoint == null || !endpoint.hasScheme || !endpoint.hasAuthority) {
      if (!kDebugMode) {
        throw StateError(
          'API_BASE_URL must be an absolute URL. Provide it with --dart-define.',
        );
      }
    }
    if (!kDebugMode && endpoint?.scheme != 'https') {
      throw StateError('Release builds require an HTTPS API_BASE_URL.');
    }

    dio = Dio(BaseOptions(
      baseUrl: resolvedUrl,
      connectTimeout: const Duration(seconds: 3),
      receiveTimeout: const Duration(seconds: 3),
      contentType: 'application/json',
      responseType: ResponseType.json,
    ));

    if (!kIsWeb) {
      dio.interceptors.add(CookieManager(CookieJar()));
    }
    dio.interceptors.add(_AuthInterceptor());
    _initialized = true;
  }

  /// Save the authenticated user as JSON string.
  static Future<void> saveUser(String userJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(userKey, userJson);
  }

  /// Retrieve the stored user JSON (or null).
  static Future<String?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(userKey);
  }

  /// Clear all auth data (on logout or session expiry).
  static Future<void> clearAuth() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(userKey);
    await prefs.remove(tenantKey);
  }
}

/// Clears local user state when the server rejects the session.
class _AuthInterceptor extends Interceptor {
  @override
  Future<void> onError(
      DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Session expired or token invalidated
      await ApiClient.clearAuth();
    }

    // Surface a human-readable message from the API response body.
    if (err.response?.data is Map) {
      final body = err.response!.data as Map<String, dynamic>;
      final message = body['error'] as String? ?? body['message'] as String?;
      if (message != null) {
        handler.next(DioException(
          requestOptions: err.requestOptions,
          response: err.response,
          type: err.type,
          error: message,
          message: message,
        ));
        return;
      }
    }
    handler.next(err);
  }
}
