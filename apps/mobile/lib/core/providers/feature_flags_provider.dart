/// Role-aware, persisted feature flags for portal UI controls.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tms_mobile/core/providers/auth_provider.dart';

/// Stable feature-flag identifiers. Do not change existing values once stored.
class FeatureFlags {
  static const String studentBilling = 'student_billing_enabled';
  static const String studentSyllabus = 'student_syllabus_enabled';
  static const String studentAnalytics = 'student_analytics_enabled';
  static const String parentAcademics = 'parent_academics_enabled';
  static const String teacherLeaveRequests = 'teacher_leave_requests_enabled';
  static const String parentChildPerformance =
      'parent_child_performance_enabled';
  static const String studentCertificates = 'student_certificates_enabled';
  static const String teacherGradeSubmissions =
      'teacher_grade_submissions_enabled';
}

const Map<String, Map<String, bool>> _defaultFlags = {
  'STUDENT': {
    FeatureFlags.studentBilling: false,
    FeatureFlags.studentSyllabus: true,
    FeatureFlags.studentAnalytics: true,
    FeatureFlags.studentCertificates: true,
  },
  'PARENT': {
    FeatureFlags.parentAcademics: true,
    FeatureFlags.parentChildPerformance: true,
  },
  'TEACHER': {
    FeatureFlags.teacherLeaveRequests: true,
    FeatureFlags.teacherGradeSubmissions: true,
  },
  'ADMIN': {
    FeatureFlags.studentBilling: true,
    FeatureFlags.studentSyllabus: true,
    FeatureFlags.studentAnalytics: true,
    FeatureFlags.studentCertificates: true,
    FeatureFlags.parentAcademics: true,
    FeatureFlags.parentChildPerformance: true,
    FeatureFlags.teacherLeaveRequests: true,
    FeatureFlags.teacherGradeSubmissions: true,
  },
};

class FeatureFlagsState {
  const FeatureFlagsState({
    required this.role,
    required this.flags,
    this.isLoaded = false,
  });

  final String role;
  final Map<String, bool> flags;
  final bool isLoaded;

  bool isEnabled(String featureKey) => flags[featureKey] ?? false;

  FeatureFlagsState copyWith({Map<String, bool>? flags, bool? isLoaded}) {
    return FeatureFlagsState(
      role: role,
      flags: flags ?? this.flags,
      isLoaded: isLoaded ?? this.isLoaded,
    );
  }
}

class FeatureFlagsNotifier extends StateNotifier<FeatureFlagsState> {
  FeatureFlagsNotifier(String role)
      : super(
          FeatureFlagsState(
            role: role.toUpperCase(),
            flags:
                Map.unmodifiable(_defaultFlags[role.toUpperCase()] ?? const {}),
          ),
        ) {
    _loadPersistedFlags();
  }

  String get _storagePrefix => '${state.role}_';

  Future<void> _loadPersistedFlags() async {
    final prefs = await SharedPreferences.getInstance();
    final loaded = Map<String, bool>.from(state.flags);
    for (final key in loaded.keys) {
      final storedKey = '$_storagePrefix$key';
      if (prefs.containsKey(storedKey)) {
        loaded[key] = prefs.getBool(storedKey) ?? loaded[key]!;
      }
    }
    state = state.copyWith(flags: Map.unmodifiable(loaded), isLoaded: true);
  }

  Future<void> setEnabled(String featureKey, bool enabled) async {
    final updated = Map<String, bool>.from(state.flags)..[featureKey] = enabled;
    state = state.copyWith(flags: Map.unmodifiable(updated));
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('$_storagePrefix$featureKey', enabled);
  }

  Future<void> toggle(String featureKey) =>
      setEnabled(featureKey, !state.isEnabled(featureKey));

  Future<void> resetToDefaults() async {
    final defaults = _defaultFlags[state.role] ?? const <String, bool>{};
    state = state.copyWith(flags: Map.unmodifiable(defaults));
    final prefs = await SharedPreferences.getInstance();
    for (final key in defaults.keys) {
      await prefs.remove('$_storagePrefix$key');
    }
  }
}

/// Synchronous, safe-to-watch role-specific flags. Defaults apply immediately;
/// stored user/admin overrides replace them when SharedPreferences has loaded.
final featureFlagsProvider =
    StateNotifierProvider<FeatureFlagsNotifier, FeatureFlagsState>((ref) {
  final role =
      ref.watch(authProvider.select((state) => state.user?.role)) ?? 'STUDENT';
  return FeatureFlagsNotifier(role);
});

extension FeatureFlagsRef on WidgetRef {
  bool isFeatureEnabled(String featureKey) =>
      watch(featureFlagsProvider).isEnabled(featureKey);
}
