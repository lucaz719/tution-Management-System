import 'package:dio/dio.dart';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:path_provider/path_provider.dart';
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
  static const String _configuredBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: kDebugMode ? 'http://10.0.2.2:3001' : '',
  );

  static String get baseUrl => _configuredBaseUrl;

  static const String userKey = 'tms_auth_user';
  static const String tenantKey = 'tms_tenant_id';

  late final Dio dio;
  bool _initialized = false;
  static PersistCookieJar? _cookieJar;

  /// Fired after local session data is cleared on a 401. The app layer
  /// (auth provider) sets this so the router redirects to /login.
  static void Function()? onSessionInvalidated;

  /// Initialize the client. Call once from main() before runApp.
  Future<void> init() async {
    if (_initialized) return;

    final endpoint = Uri.tryParse(_configuredBaseUrl);
    if (endpoint == null || !endpoint.hasScheme || !endpoint.hasAuthority) {
      throw StateError(
        'API_BASE_URL must be an absolute URL. Provide it with --dart-define.',
      );
    }
    if (!kDebugMode && endpoint.scheme != 'https') {
      throw StateError('Release builds require an HTTPS API_BASE_URL.');
    }

    dio = Dio(BaseOptions(
      baseUrl: _configuredBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      contentType: 'application/json',
      responseType: ResponseType.json,
    ));

    if (!kIsWeb) {
      // MOB-004: persist session cookies across restarts so the Better Auth
      // session survives app relaunch. Web keeps an in-memory jar.
      final supportDir = await getApplicationSupportDirectory();
      _cookieJar = PersistCookieJar(
        storage: FileStorage('${supportDir.path}/cookies'),
      );
      dio.interceptors.add(CookieManager(_cookieJar!));
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
    await _cookieJar?.deleteAll();
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
      // Session expired or invalidated: clear local state, then tell the
      // app layer so the router kicks back to /login (MOB-005).
      await ApiClient.clearAuth();
      ApiClient.onSessionInvalidated?.call();
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
