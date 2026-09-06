/// API-backed ViewModels for the teacher home + timetable screens.
///
/// Both read from one `GET /api/teacher/workspace` call per load via
/// [TeacherPortalRepository]. Timetable tabs are derived client-side:
/// today from `todayClasses`, weekly from `classes[].schedule`.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tms_mobile/core/network/api_exception.dart';
import 'package:tms_mobile/core/network/request_cancellation.dart';
import 'package:tms_mobile/core/viewmodel/base_viewmodel.dart';
import 'package:tms_mobile/features/teacher/data/teacher_portal_repository.dart';
import 'package:tms_mobile/features/teacher/models/teacher_portal_dto.dart';

@immutable
class TeacherPortalState extends ViewModelState {
  const TeacherPortalState({
    this.workspace,
    this.isRefreshing = false,
    this.errorKind,
    super.error,
    super.isLoading,
  });

  final TeacherWorkspace? workspace;
  final bool isRefreshing;
  final ApiErrorKind? errorKind;

  bool get hasData => workspace != null;
  bool get isOffline => errorKind == ApiErrorKind.noConnection;
  bool get isDenied => errorKind == ApiErrorKind.forbidden;

  TeacherPortalState copyWith({
    TeacherWorkspace? workspace,
    bool? isRefreshing,
    ApiErrorKind? errorKind,
    bool clearErrorKind = false,
    bool? isLoading,
    String? error,
    bool clearError = false,
  }) {
    return TeacherPortalState(
      workspace: workspace ?? this.workspace,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      errorKind: clearErrorKind ? null : (errorKind ?? this.errorKind),
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class TeacherPortalViewModel extends BaseViewModel<TeacherPortalState> {
  TeacherPortalViewModel({
    TeacherPortalRepository? repository,
    RequestCanceller? canceller,
  })  : _repository = repository ?? TeacherPortalRepository(),
        _canceller = canceller ?? RequestCanceller(),
        super(const TeacherPortalState(isLoading: true)) {
    load();
  }

  final TeacherPortalRepository _repository;
  final RequestCanceller _canceller;

  Future<void> load() async {
    state =
        state.copyWith(isLoading: true, clearError: true, clearErrorKind: true);
    try {
      final workspace = await _repository.fetchWorkspace(
        cancelToken: _canceller.tokenFor('workspace'),
      );
      state = state.copyWith(
        isLoading: false,
        workspace: workspace,
        clearError: true,
        clearErrorKind: true,
      );
    } on ApiException catch (error) {
      if (error.kind == ApiErrorKind.cancelled) return;
      state = state.copyWith(
        isLoading: false,
        error: error.message,
        errorKind: error.kind,
      );
    }
  }

  Future<void> refresh() async {
    state = state.copyWith(isRefreshing: true);
    try {
      final workspace = await _repository.fetchWorkspace(
        cancelToken: _canceller.tokenFor('workspace'),
      );
      state = state.copyWith(
        isRefreshing: false,
        workspace: workspace,
        clearError: true,
        clearErrorKind: true,
      );
    } on ApiException catch (error) {
      if (error.kind == ApiErrorKind.cancelled) {
        state = state.copyWith(isRefreshing: false);
        return;
      }
      state = state.copyWith(
        isRefreshing: false,
        error: error.message,
        errorKind: error.kind,
      );
    }
  }

  @override
  void dispose() {
    _canceller.cancelAll();
    super.dispose();
  }
}

final teacherPortalViewModelProvider =
    StateNotifierProvider<TeacherPortalViewModel, TeacherPortalState>((ref) {
  return TeacherPortalViewModel();
});
