import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Central API client for the TMS mobile app.
///
/// Uses Dio with an auth-token interceptor that reads from SharedPreferences.
/// All backend calls should go through [ApiClient.dio] to get automatic
/// token injection and consistent error handling.
class ApiClient {
  ApiClient._();

  static final ApiClient _instance = ApiClient._();
  static ApiClient get instance => _instance;

  // Point to the Express backend. For Android emulator use 10.0.2.2
  // instead of localhost. For physical device, use your machine's LAN IP.
  static const String _baseUrl = 'http://10.0.2.2:3001';

  static const String tokenKey = 'tms_auth_token';
  static const String userKey = 'tms_auth_user';
  static const String tenantKey = 'tms_tenant_id';

  late final Dio dio;
  bool _initialized = false;

  /// Initialize the client. Call once from main() before runApp.
  Future<void> init() async {
    if (_initialized) return;

    dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      contentType: 'application/json',
      responseType: ResponseType.json,
    ));

    dio.interceptors.add(_AuthInterceptor());
    _initialized = true;
  }

  /// Save authentication token after successful login.
  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(tokenKey, token);
  }

  /// Retrieve the stored auth token (or null).
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(tokenKey);
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
    await prefs.remove(tokenKey);
    await prefs.remove(userKey);
    await prefs.remove(tenantKey);
  }
}

/// Injects the Bearer token into every outbound request and clears auth on 401.
class _AuthInterceptor extends Interceptor {
  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await ApiClient.getToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
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
