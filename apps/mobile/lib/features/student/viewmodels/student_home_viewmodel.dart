/// Student Home ViewModel using MVVM pattern.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tms_mobile/core/viewmodel/base_viewmodel.dart';
import 'package:tms_mobile/features/student/models/student_portal_models.dart';
import 'package:tms_mobile/features/student/data/student_demo_data.dart';

/// Student home state.
@immutable
class StudentHomeState extends ViewModelState {
  const StudentHomeState({
    this.sessions = const [],
    this.homework = const [],
    this.results = const [],
    this.insights = const [],
    this.attendance = const [],
    this.invoices = const [],
    this.certificates = const [],
    this.events = const [],
    this.notices = const [],
    this.currentTab = 0,
    super.error,
    super.isLoading,
  });

  final List<StudentSession> sessions;
  final List<StudentHomework> homework;
  final List<TestResult> results;
  final List<SubjectInsight> insights;
  final List<StudentAttendanceRecord> attendance;
  final List<StudentInvoice> invoices;
  final List<StudentCertificate> certificates;
  final List<StudentAcademicEvent> events;
  final List<StudentNotice> notices;
  final int currentTab;

  double get overdueAmount => invoices
      .where((invoice) => invoice.state == FeeDeadlineState.overdue)
      .fold<double>(0, (sum, invoice) => sum + invoice.netPayable);

  int get unreadNotices => notices.where((notice) => !notice.isRead).length;

  StudentHomeState copyWith({
    List<StudentSession>? sessions,
    List<StudentHomework>? homework,
    List<TestResult>? results,
    List<SubjectInsight>? insights,
    List<StudentAttendanceRecord>? attendance,
    List<StudentInvoice>? invoices,
    List<StudentCertificate>? certificates,
    List<StudentAcademicEvent>? events,
    List<StudentNotice>? notices,
    int? currentTab,
    bool? isLoading,
    String? error,
  }) {
    return StudentHomeState(
      sessions: sessions ?? this.sessions,
      homework: homework ?? this.homework,
      results: results ?? this.results,
      insights: insights ?? this.insights,
      attendance: attendance ?? this.attendance,
      invoices: invoices ?? this.invoices,
      certificates: certificates ?? this.certificates,
      events: events ?? this.events,
      notices: notices ?? this.notices,
      currentTab: currentTab ?? this.currentTab,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

/// Student Home ViewModel.
class StudentHomeViewModel extends BaseViewModel<StudentHomeState> {
  StudentHomeViewModel() : super(const StudentHomeState()) {
    _loadData();
  }

  Future<void> _loadData() async {
    state = state.copyWith(isLoading: true);
    try {
      state = state.copyWith(
        isLoading: false,
        sessions: StudentDemoData.sessions,
        homework: StudentDemoData.homework,
        results: StudentDemoData.results,
        insights: StudentDemoData.insights,
        attendance: StudentDemoData.attendance,
        invoices: StudentDemoData.invoices,
        certificates: StudentDemoData.certificates,
        events: StudentDemoData.events,
        notices: StudentDemoData.notices,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to load student data: $e',
      );
    }
  }

  void setCurrentTab(int index) {
    state = state.copyWith(currentTab: index);
  }

  void markNoticeRead(String noticeId) {
    final updatedNotices = state.notices.map((notice) {
      if (notice.id == noticeId) {
        return StudentNotice(
          id: notice.id,
          title: notice.title,
          message: notice.message,
          createdAt: notice.createdAt,
          route: notice.route,
          isRead: true,
        );
      }
      return notice;
    }).toList();
    state = state.copyWith(notices: updatedNotices);
  }

  void refresh() {
    _loadData();
  }
}

/// Provider for StudentHomeViewModel.
final studentHomeViewModelProvider =
    StateNotifierProvider<StudentHomeViewModel, StudentHomeState>((ref) {
  return StudentHomeViewModel();
});
