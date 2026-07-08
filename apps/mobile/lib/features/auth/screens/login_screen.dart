import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:tms_mobile/core/theme/app_colors.dart';
import 'package:tms_mobile/core/utils/validators.dart';
import 'package:tms_mobile/features/auth/data/mock_auth_service.dart';
import 'package:tms_mobile/features/auth/screens/forgot_password_screen.dart';
import 'package:tms_mobile/features/auth/screens/two_factor_screen.dart';
import 'package:tms_mobile/features/auth/widgets/auth_card.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _rememberMe = true;
  bool _obscurePassword = true;
  bool _isLoading = false;
  int _failedAttempts = 0;
  bool _isLocked = false;

  int get _remainingAttempts => (5 - _failedAttempts).clamp(0, 5);
  bool get _canSubmit =>
      !_isLoading &&
      !_isLocked &&
      _emailController.text.trim().isNotEmpty &&
      _passwordController.text.isNotEmpty;

  @override
  void initState() {
    super.initState();
    _emailController.addListener(_refresh);
    _passwordController.addListener(_refresh);
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _refresh() => setState(() {});

  void _showFailureSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Container(
          padding: const EdgeInsets.only(left: 12),
          decoration: const BoxDecoration(
            border: Border(left: BorderSide(color: kColorError, width: 4)),
          ),
          child: Text(message),
        ),
      ),
    );
  }

  Future<void> _showLockDialog() async {
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Account locked'),
          content: const Text(
            'Too many failed sign-in attempts. Reset your password or contact your admin to regain access.',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(dialogContext).pop();
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const ForgotPasswordScreen(),
                  ),
                );
              },
              child: const Text('Reset Password'),
            ),
            FilledButton.tonal(
              onPressed: () {
                Navigator.of(dialogContext).pop();
                _showFailureSnackBar(
                    'Contact your branch admin for account assistance.');
              },
              child: const Text('Contact Admin'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _submit() async {
    if (!_canSubmit || !_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isLoading = true);
    try {
      final result = await MockAuthService.signIn(
        email: _emailController.text,
        password: _passwordController.text,
        rememberMe: _rememberMe,
      );
      if (!mounted) return;
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => TwoFactorScreen(email: result.email),
        ),
      );
    } on AuthFailure catch (error) {
      _failedAttempts++;
      _showFailureSnackBar(
        '${error.message} $_remainingAttempts attempts remaining before account lock.',
      );
      if (_failedAttempts >= 5) {
        _isLocked = true;
        await _showLockDialog();
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthCard(
      child: Form(
        key: _formKey,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const FlutterLogo(size: 68),
            const SizedBox(height: 16),
            Text(
              'Tuition Management System',
              textAlign: TextAlign.center,
              style: GoogleFonts.fraunces(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: kColorText,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Secure teacher access',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: kColorText.withOpacity(0.7),
                  ),
            ),
            const SizedBox(height: 28),
            Text(
              'Sign In',
              style: Theme.of(context).textTheme.headlineMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            TextFormField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Email',
                hintText: 'teacher@tms.edu.np',
              ),
              validator: AppValidators.validateEmail,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _passwordController,
              obscureText: _obscurePassword,
              decoration: InputDecoration(
                labelText: 'Password',
                suffixIcon: IconButton(
                  onPressed: () =>
                      setState(() => _obscurePassword = !_obscurePassword),
                  icon: Icon(
                    _obscurePassword ? Icons.visibility_off : Icons.visibility,
                  ),
                ),
              ),
              validator: (value) => value == null || value.isEmpty
                  ? 'Password is required'
                  : null,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: CheckboxListTile(
                    value: _rememberMe,
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                    title: const Text('Remember me'),
                    onChanged: (value) =>
                        setState(() => _rememberMe = value ?? false),
                  ),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const ForgotPasswordScreen(),
                      ),
                    );
                  },
                  child: const Text('Forgot Password?'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 56,
              child: ElevatedButton(
                onPressed: _canSubmit ? _submit : null,
                child: _isLoading
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Sign In'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
