import 'package:flutter/material.dart';
import '../../../core/adaptive/breakpoints.dart';
import '../../../core/adaptive/widgets/responsive_widgets.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final sizeClass = Breakpoints.fromWidth(MediaQuery.sizeOf(context).width);
    return LoginScreenResponsive(sizeClass: sizeClass);
  }
}
