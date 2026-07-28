class AuthFailure implements Exception {
  const AuthFailure(this.message);

  final String message;
}

class AuthResult {
  const AuthResult({
    required this.email,
    required this.role,
    required this.requiresTwoFactor,
  });

  final String email;
  final String role;
  final bool requiresTwoFactor;
}

class MockAuthService {
  static Future<AuthResult> signIn({
    required String email,
    required String password,
    required bool rememberMe,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 600));
    final normalizedEmail = email.trim().toLowerCase();

    throw const AuthFailure('Mobile authentication is not configured. Connect the API auth client before using this build.');
  }

  static Future<void> sendPasswordOtp(String email) async {
    await Future<void>.delayed(const Duration(milliseconds: 400));
    if (email.trim().isEmpty) {
      throw const AuthFailure('Email is required.');
    }
  }

  static Future<void> verifyPasswordOtp(String code) async {
    throw const AuthFailure('Password recovery is not configured.');
  }

  static Future<void> resetPassword(String password) async {
    await Future<void>.delayed(const Duration(milliseconds: 500));
    if (password.isEmpty) {
      throw const AuthFailure('Password cannot be empty.');
    }
  }

  static Future<void> sendTwoFactorCode() async {
    throw const AuthFailure('Two-factor authentication is not configured.');
  }

  static Future<void> verifyTwoFactorCode(String code) async {
    await Future<void>.delayed(const Duration(milliseconds: 400));
    throw const AuthFailure('Two-factor authentication is not configured.');
  }
}
