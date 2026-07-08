class AuthFailure implements Exception {
  const AuthFailure(this.message);

  final String message;
}

class AuthResult {
  const AuthResult({
    required this.email,
    required this.requiresTwoFactor,
  });

  final String email;
  final bool requiresTwoFactor;
}

class MockAuthService {
  static const String demoEmail = 'teacher@tms.edu.np';
  static const String demoPassword = 'Teacher@123';
  static const String forgotPasswordOtp = '654321';
  static const String twoFactorOtp = '246810';

  static Future<AuthResult> signIn({
    required String email,
    required String password,
    required bool rememberMe,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 900));
    final normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail != demoEmail || password != demoPassword) {
      throw const AuthFailure('Invalid email or password.');
    }

    return AuthResult(email: normalizedEmail, requiresTwoFactor: true);
  }

  static Future<void> sendPasswordOtp(String email) async {
    await Future<void>.delayed(const Duration(milliseconds: 800));
    if (email.trim().isEmpty) {
      throw const AuthFailure('Email is required.');
    }
  }

  static Future<void> verifyPasswordOtp(String code) async {
    await Future<void>.delayed(const Duration(milliseconds: 700));
    if (code != forgotPasswordOtp) {
      throw const AuthFailure('That OTP is incorrect. Please try again.');
    }
  }

  static Future<void> resetPassword(String password) async {
    await Future<void>.delayed(const Duration(milliseconds: 900));
    if (password.isEmpty) {
      throw const AuthFailure('Password cannot be empty.');
    }
  }

  static Future<void> sendTwoFactorCode() async {
    await Future<void>.delayed(const Duration(milliseconds: 700));
  }

  static Future<void> verifyTwoFactorCode(String code) async {
    await Future<void>.delayed(const Duration(milliseconds: 700));
    if (code != twoFactorOtp) {
      throw const AuthFailure('That verification code is invalid.');
    }
  }
}
