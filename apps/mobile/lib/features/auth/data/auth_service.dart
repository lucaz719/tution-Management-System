import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:tms_mobile/core/auth/role_codes.dart';
import 'package:tms_mobile/core/network/api_client.dart';

/// Represents a failure in the auth flow with a human-readable message.
class AuthFailure implements Exception {
  const AuthFailure(this.message);
  final String message;

  @override
  String toString() => 'AuthFailure: $message';
}

/// User model returned after successful authentication.
class AuthUser {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String role;
  final String? tenantId;
  final bool requiresTwoFactor;

  const AuthUser({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.tenantId,
    this.requiresTwoFactor = false,
  });

  String get name => '$firstName $lastName'.trim();

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    // The API may return user data nested inside a 'user' key or flat.
    final user = json.containsKey('user') && json['user'] is Map
        ? json['user'] as Map<String, dynamic>
        : json;

    // API may return a direct role code/name or a roles entry with roleName.
    String? rawRole;
    if (user['role'] is String) {
      rawRole = user['role'] as String;
    } else if (user['roles'] is List && (user['roles'] as List).isNotEmpty) {
      final firstRole = (user['roles'] as List).first;
      if (firstRole is Map) {
        rawRole = firstRole['roleName'] as String?;
      }
    }

    final role = normalizeRoleCode(rawRole);
    if (role == null) {
      throw const AuthFailure(
        'Your account role is not supported by this mobile app.',
      );
    }

    return AuthUser(
      id: user['id'] as String? ?? '',
      email: user['email'] as String? ?? '',
      firstName: user['firstName'] as String? ??
          user['name']?.toString().split(' ').first ??
          '',
      lastName: user['lastName'] as String? ??
          (((user['name']?.toString().split(' ').length ?? 0) > 1)
              ? user['name']!.toString().split(' ').sublist(1).join(' ')
              : ''),
      role: role,
      tenantId: json['tenantId'] as String? ?? user['tenantId'] as String?,
      requiresTwoFactor: user['requiresTwoFactor'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'firstName': firstName,
        'lastName': lastName,
        'role': role,
        'tenantId': tenantId,
        'requiresTwoFactor': requiresTwoFactor,
      };
}

/// Auth service that calls the real TMS backend API.
///
/// Better Auth endpoints:
///   POST /api/auth/sign-in/email   → email + password → secure session cookie
///   GET  /api/auth/get-session     → current user/session
///   POST /api/auth/sign-out        → invalidate session
///   POST /api/auth/forgot-password → email → sends OTP
///   POST /api/auth/verify-reset-otp → email + otp → resetToken
///   POST /api/auth/reset-password  → resetToken + newPassword
///   POST /api/auth/2fa/request     → email → sends 2FA code
///   POST /api/auth/2fa/verify      → email + code → success
class AuthService {
  AuthService._();

  static Dio get _dio => ApiClient.instance.dio;

  /// Authenticate with email + password and retain the Better Auth cookie.
  static Future<AuthUser> signIn({
    required String email,
    required String password,
  }) async {
    try {
      await _dio.post(
        '/api/auth/sign-in/email',
        data: {
          'email': email.trim().toLowerCase(),
          'password': password,
        },
      );
      final session = await _dio.get('/api/auth/get-session');
      final user = AuthUser.fromJson(session.data as Map<String, dynamic>);
      await ApiClient.saveUser(jsonEncode(user.toJson()));

      return user;
    } on DioException catch (e) {
      throw AuthFailure(_extractMessage(e, 'Invalid email or password.'));
    } catch (e) {
      if (e is AuthFailure) rethrow;
      throw AuthFailure('An unexpected error occurred: $e');
    }
  }

  /// Request a password-reset OTP to be sent to [email].
  static Future<void> sendPasswordOtp(String email) async {
    try {
      await _dio.post(
        '/api/auth/forgot-password',
        data: {'email': email.trim().toLowerCase()},
      );
    } on DioException catch (e) {
      throw AuthFailure(
          _extractMessage(e, 'Failed to send OTP. Please try again.'));
    }
  }

  /// Verify the password-reset OTP and get a reset token.
  /// Returns the reset token string on success.
  static Future<String> verifyPasswordOtp({
    required String email,
    required String otp,
  }) async {
    try {
      final response = await _dio.post(
        '/api/auth/verify-reset-otp',
        data: {
          'email': email.trim().toLowerCase(),
          'otp': otp.trim(),
        },
      );

      final data = response.data as Map<String, dynamic>;
      final resetToken = data['resetToken'] as String?;

      if (resetToken == null || resetToken.isEmpty) {
        throw const AuthFailure(
            'Verification succeeded but no reset token was returned.');
      }

      return resetToken;
    } on DioException catch (e) {
      throw AuthFailure(_extractMessage(e, 'Invalid or expired OTP.'));
    }
  }

  /// Reset the password using the token from [verifyPasswordOtp].
  static Future<void> resetPassword({
    required String resetToken,
    required String newPassword,
  }) async {
    try {
      await _dio.post(
        '/api/auth/reset-password',
        data: {
          'resetToken': resetToken,
          'newPassword': newPassword,
        },
      );
    } on DioException catch (e) {
      throw AuthFailure(_extractMessage(e, 'Failed to reset password.'));
    }
  }

  /// Change password for authenticated user (requires current password).
  static Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      await _dio.post(
        '/api/auth/change-password',
        data: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
      );
    } on DioException catch (e) {
      throw AuthFailure(_extractMessage(e, 'Failed to change password.'));
    }
  }

  /// Request a 2FA verification code for [email].
  static Future<void> sendTwoFactorCode(String email) async {
    try {
      await _dio.post(
        '/api/auth/2fa/request',
        data: {'email': email.trim().toLowerCase()},
      );
    } on DioException catch (e) {
      throw AuthFailure(
          _extractMessage(e, 'Failed to send verification code.'));
    }
  }

  /// Verify the 2FA code.
  static Future<void> verifyTwoFactorCode({
    required String email,
    required String code,
  }) async {
    try {
      await _dio.post(
        '/api/auth/2fa/verify',
        data: {
          'email': email.trim().toLowerCase(),
          'code': code.trim(),
        },
      );
    } on DioException catch (e) {
      throw AuthFailure(_extractMessage(e, 'Invalid verification code.'));
    }
  }

  /// Sign out — clear local session data.
  static Future<void> signOut() async {
    try {
      await _dio.post('/api/auth/sign-out');
    } finally {
      await ApiClient.clearAuth();
    }
  }

  /// Try to restore the server-backed session.
  static Future<AuthUser?> restoreSession() async {
    try {
      final session = await _dio.get('/api/auth/get-session');
      if (session.data is! Map<String, dynamic> ||
          (session.data as Map)['user'] == null) {
        return null;
      }
      final user = AuthUser.fromJson(session.data as Map<String, dynamic>);
      await ApiClient.saveUser(jsonEncode(user.toJson()));
      return user;
    } on DioException {
      return null;
    }
  }

  /// Extract a user-friendly error message from a Dio exception.
  static String _extractMessage(DioException e, String fallback) {
    final message = e.message;
    if (message != null && message.isNotEmpty) return message;

    if (e.response?.data is Map) {
      final body = e.response!.data as Map<String, dynamic>;
      return body['error'] as String? ?? body['message'] as String? ?? fallback;
    }

    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return 'Connection timed out. Please check your internet connection.';
    }

    if (e.type == DioExceptionType.connectionError) {
      return 'Cannot reach the server. Please check your connection.';
    }

    return fallback;
  }
}
