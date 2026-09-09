import 'package:flutter/material.dart';
import '../breakpoints.dart';

typedef ResponsiveWidgetBuilder = Widget Function(
  BuildContext context,
  LayoutSizeClass sizeClass,
);

class LoginScreenResponsive extends StatelessWidget {
  final LayoutSizeClass sizeClass;

  const LoginScreenResponsive({required this.sizeClass, super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Tuition Management System',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 40),
                if (sizeClass.isCompact) ..._buildCompactFields(),
                if (!sizeClass.isCompact) ..._buildExpandedFields(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildCompactFields() {
    return const [
      TextField(
        decoration: InputDecoration(label: Text('Email/Phone')),
        keyboardType: TextInputType.emailAddress,
      ),
      SizedBox(height: 16),
      TextField(
        decoration: InputDecoration(label: Text('Password')),
        obscureText: true,
      ),
      SizedBox(height: 24),
      SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: null,
          child: Text('Sign In'),
        ),
      ),
    ];
  }

  List<Widget> _buildExpandedFields() {
    return [
      Row(
        children: [
          Expanded(
            child: TextField(
              decoration: const InputDecoration(label: Text('Email/Phone')),
              keyboardType: TextInputType.emailAddress,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: TextField(
              decoration: const InputDecoration(label: Text('Password')),
              obscureText: true,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: ElevatedButton(
              onPressed: null,
              child: const Text('Sign In'),
            ),
          ),
        ],
      ),
    ];
  }
}

class TeacherHomeScreenResponsive extends StatelessWidget {
  final LayoutSizeClass sizeClass;

  const TeacherHomeScreenResponsive({required this.sizeClass, super.key});

  @override
  Widget build(BuildContext context) {
    if (sizeClass.isCompact) {
      return Scaffold(
        body: Column(
          children: const [
            Text('Teacher Dashboard'),
            Expanded(child: Text('Content for teacher home')),
          ],
        ),
      );
    } else {
      return Row(
        children: const [
          Expanded(child: Text('Teacher Dashboard')),
          Expanded(child: Text('Content for teacher home')),
        ],
      );
    }
  }
}

class StudentHomeScreenResponsive extends StatelessWidget {
  final LayoutSizeClass sizeClass;

  const StudentHomeScreenResponsive({required this.sizeClass, super.key});

  @override
  Widget build(BuildContext context) {
    if (sizeClass.isCompact) {
      return Scaffold(
        body: Column(
          children: const [
            Text('Student Dashboard'),
            Expanded(child: Text('Content for student home')),
          ],
        ),
      );
    } else {
      return Row(
        children: const [
          Expanded(child: Text('Student Dashboard')),
          Expanded(child: Text('Content for student home')),
        ],
      );
    }
  }
}
