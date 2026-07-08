import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tms_mobile/features/auth/screens/login_screen.dart';
import 'package:tms_mobile/features/auth/screens/forgot_password_screen.dart';
import 'package:tms_mobile/features/auth/screens/reset_password_screen.dart';
import 'package:tms_mobile/features/auth/screens/two_factor_screen.dart';
import 'package:tms_mobile/features/teacher/screens/teacher_home_screen.dart';
import 'package:tms_mobile/features/teacher/screens/geo_attendance_screen.dart';
import 'package:tms_mobile/features/teacher/models/teacher_models.dart';
import 'package:tms_mobile/features/parent/screens/parent_home_screen.dart';
import 'package:tms_mobile/features/parent/screens/parent_attendance_screen.dart';
import 'package:tms_mobile/features/parent/screens/parent_fees_screen.dart';
import 'package:tms_mobile/features/student/screens/student_home_screen.dart';
import 'package:tms_mobile/features/student/screens/student_timetable_screen.dart';
import 'package:tms_mobile/features/student/screens/student_fees_screen.dart';
import 'package:tms_mobile/features/student/screens/student_id_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/login',
    routes: <RouteBase>[
      GoRoute(
        path: '/login',
        builder: (BuildContext context, GoRouterState state) =>
            const LoginScreen(),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (BuildContext context, GoRouterState state) =>
            const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/reset-password',
        builder: (BuildContext context, GoRouterState state) {
          final email = state.extra as String? ?? 'teacher@tms.edu.np';
          return ResetPasswordScreen(email: email);
        },
      ),
      GoRoute(
        path: '/2fa',
        builder: (BuildContext context, GoRouterState state) {
          final email = state.extra as String? ?? 'teacher@tms.edu.np';
          return TwoFactorScreen(email: email);
        },
      ),
      GoRoute(
        path: '/teacher/home',
        builder: (BuildContext context, GoRouterState state) =>
            const TeacherHomeScreen(),
      ),
      GoRoute(
        path: '/teacher/attendance',
        builder: (BuildContext context, GoRouterState state) {
          final session = state.extra as TeacherClassSession?;
          if (session == null) {
            return const Scaffold(
              body: Center(
                child: Text('Session data is required for geo attendance.'),
              ),
            );
          }
          return GeoAttendanceScreen(session: session);
        },
      ),
      GoRoute(
        path: '/parent/home',
        builder: (BuildContext context, GoRouterState state) =>
            const ParentHomeScreen(),
      ),
      GoRoute(
        path: '/parent/attendance',
        builder: (BuildContext context, GoRouterState state) =>
            const ParentAttendanceScreen(),
      ),
      GoRoute(
        path: '/parent/fees',
        builder: (BuildContext context, GoRouterState state) =>
            const ParentFeesScreen(),
      ),
      GoRoute(
        path: '/student/home',
        builder: (BuildContext context, GoRouterState state) =>
            const StudentHomeScreen(),
      ),
      GoRoute(
        path: '/student/timetable',
        builder: (BuildContext context, GoRouterState state) =>
            const StudentTimetableScreen(),
      ),
      GoRoute(
        path: '/student/fees',
        builder: (BuildContext context, GoRouterState state) =>
            const StudentFeesScreen(),
      ),
      GoRoute(
        path: '/student/id',
        builder: (BuildContext context, GoRouterState state) =>
            const StudentIdScreen(),
      ),
    ],
  );
});
