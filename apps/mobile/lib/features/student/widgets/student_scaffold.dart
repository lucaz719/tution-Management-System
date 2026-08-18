import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../student_design.dart';

class StudentScaffold extends StatelessWidget {
  const StudentScaffold({
    super.key,
    required this.title,
    required this.body,
    this.selectedIndex,
    this.actions,
    this.floatingActionButton,
  });

  final String title;
  final Widget body;
  final int? selectedIndex;
  final List<Widget>? actions;
  final Widget? floatingActionButton;

  static const _routes = <String>[
    '/student/home',
    '/student/academics',
    '/student/fees',
    '/student/calendar',
    '/student/id',
  ];

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: buildStudentTheme(Theme.of(context)),
      child: Builder(
        builder: (context) => Scaffold(
          appBar: AppBar(title: Text(title), actions: actions),
          body: SafeArea(child: body),
          floatingActionButton: floatingActionButton,
          bottomNavigationBar: selectedIndex == null
              ? null
              : NavigationBar(
                  selectedIndex: selectedIndex!,
                  onDestinationSelected: (index) {
                    if (index != selectedIndex) context.go(_routes[index]);
                  },
                  destinations: const [
                    NavigationDestination(
                      icon: Icon(Icons.home_outlined),
                      selectedIcon: Icon(Icons.home_rounded),
                      label: 'Home',
                    ),
                    NavigationDestination(
                      icon: Icon(Icons.school_outlined),
                      selectedIcon: Icon(Icons.school_rounded),
                      label: 'Academics',
                    ),
                    NavigationDestination(
                      icon: Icon(Icons.receipt_long_outlined),
                      selectedIcon: Icon(Icons.receipt_long_rounded),
                      label: 'Fees',
                    ),
                    NavigationDestination(
                      icon: Icon(Icons.calendar_month_outlined),
                      selectedIcon: Icon(Icons.calendar_month_rounded),
                      label: 'Calendar',
                    ),
                    NavigationDestination(
                      icon: Icon(Icons.badge_outlined),
                      selectedIcon: Icon(Icons.badge_rounded),
                      label: 'My ID',
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}

class StudentStatusPill extends StatelessWidget {
  const StudentStatusPill({
    super.key,
    required this.label,
    required this.icon,
    required this.color,
  });

  final String label;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Status: $label',
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: StudentSpace.sm,
          vertical: StudentSpace.xs,
        ),
        decoration: BoxDecoration(
          color: color.withValues(alpha: .10),
          borderRadius: BorderRadius.circular(StudentRadius.pill),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: StudentSpace.xxs),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: color,
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
