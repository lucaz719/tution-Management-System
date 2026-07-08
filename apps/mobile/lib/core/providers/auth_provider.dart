import 'package:flutter_riverpod/flutter_riverpod.dart';

class AuthUser {
  final String id;
  final String name;
  final String email;
  final String role;

  const AuthUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });
}

class AuthState {
  final AuthUser? user;
  final bool isAuthenticated;

  const AuthState({this.user, this.isAuthenticated = false});
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState(
    user: AuthUser(
      id: 'parent-user-400',
      name: 'Pinnacle Parent',
      email: 'parent@pinnacle.edu.np',
      role: 'PARENT',
    ),
    isAuthenticated: true,
  ));

  void logout() {
    state = const AuthState(user: null, isAuthenticated: false);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
