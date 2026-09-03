import 'package:flutter_test/flutter_test.dart';
import 'package:tms_mobile/core/providers/auth_provider.dart';
import 'package:tms_mobile/features/auth/data/auth_service.dart';

AuthState authenticatedAs(String role) {
  return AuthState(
    user: AuthUser(
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: role,
    ),
    isAuthenticated: true,
    isLoading: false,
  );
}

void main() {
  group('AuthState.roleRedirectPath', () {
    test('redirects tenant admins to the tenant admin home', () {
      expect(authenticatedAs('TENANT_ADMIN').roleRedirectPath, '/tenant/home');
    });

    test('redirects branch admins to the branch admin home', () {
      expect(authenticatedAs('BRANCH_ADMIN').roleRedirectPath, '/branch/home');
    });

    test('redirects janitors to the janitor home', () {
      expect(authenticatedAs('JANITOR').roleRedirectPath, '/janitor/home');
    });

    test('redirects unknown roles safely to login', () {
      expect(authenticatedAs('UNKNOWN').roleRedirectPath, '/login');
    });
  });
}
