/// Teacher Home ViewModel using MVVM pattern.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tms_mobile/core/viewmodel/base_viewmodel.dart';
import 'package:tms_mobile/features/teacher/models/teacher_models.dart';

/// Teacher home state.
@immutable
class TeacherHomeState extends ViewModelState {
  const TeacherHomeState({
    this.todayClasses = const [],
    this.weeklySchedule = const [],
    this.pendingLogs = const [],
    this.submittedLogIds = const {},
    this.currentTab = 0,
    super.error,
    super.isLoading,
  });

  final List<TeacherClassSession> todayClasses;
  final List<TeacherClassSession> weeklySchedule;
  final List<UpdateLogItem> pendingLogs;
  final Set<String> submittedLogIds;
  final int currentTab;

  TeacherHomeState copyWith({
    List<TeacherClassSession>? todayClasses,
    List<TeacherClassSession>? weeklySchedule,
    List<UpdateLogItem>? pendingLogs,
    Set<String>? submittedLogIds,
    int? currentTab,
    bool? isLoading,
    String? error,
  }) {
    return TeacherHomeState(
      todayClasses: todayClasses ?? this.todayClasses,
      weeklySchedule: weeklySchedule ?? this.weeklySchedule,
      pendingLogs: pendingLogs ?? this.pendingLogs,
      submittedLogIds: submittedLogIds ?? this.submittedLogIds,
      currentTab: currentTab ?? this.currentTab,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

/// Teacher Home ViewModel.
class TeacherHomeViewModel extends BaseViewModel<TeacherHomeState> {
  TeacherHomeViewModel() : super(const TeacherHomeState()) {
    _loadData();
  }

  Future<void> _loadData() async {
    state = state.copyWith(isLoading: true);
    try {
      // Import demo data from teacher_home_screen.dart
      final todayClasses = DemoTeacherData.todayClasses();
      final weeklySchedule = DemoTeacherData.weeklySchedule();
      final pendingLogs = DemoTeacherData.pendingLogs();

      state = state.copyWith(
        isLoading: false,
        todayClasses: todayClasses,
        weeklySchedule: weeklySchedule,
        pendingLogs: pendingLogs,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to load teacher data: $e',
      );
    }
  }

  void setCurrentTab(int index) {
    state = state.copyWith(currentTab: index);
  }

  void submitLog(String logId) {
    final newSubmitted = {...state.submittedLogIds, logId};
    state = state.copyWith(submittedLogIds: newSubmitted);
  }

  void refresh() {
    _loadData();
  }
}

/// Provider for TeacherHomeViewModel.
final teacherHomeViewModelProvider =
    StateNotifierProvider<TeacherHomeViewModel, TeacherHomeState>((ref) {
  return TeacherHomeViewModel();
});
