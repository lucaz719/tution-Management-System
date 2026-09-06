/// Parent portal ViewModel (MVVM): one authenticated portal load per
/// child selection, shared by the home, attendance, fees and academics
/// screens. Views stay thin; all IO, parsing and error classification live
/// in [ParentPortalRepository].
///
/// Child scope: [selectChild] sends the portal `children[].id` as a
/// `?studentId=` *selector only*. The server authorizes the parent link
/// (404 when unlinked), so a client-passed id is never authority.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tms_mobile/core/network/api_exception.dart';
import 'package:tms_mobile/core/network/request_cancellation.dart';
import 'package:tms_mobile/core/viewmodel/base_viewmodel.dart';

import '../data/parent_portal_repository.dart';
import '../models/parent_portal.dart';

/// Shared parent portal state.
@immutable
class ParentPortalState extends ViewModelState {
  const ParentPortalState({
    this.portal,
    this.selectedChildId,
    this.isRefreshing = false,
    this.errorKind,
    super.error,
    super.isLoading,
  });

  final ParentPortal? portal;
  final String? selectedChildId;
  final bool isRefreshing;
  final ApiErrorKind? errorKind;

  bool get hasData => portal != null;
  bool get isOffline => errorKind == ApiErrorKind.noConnection;
  bool get isDenied =>
      errorKind == ApiErrorKind.forbidden ||
      errorKind == ApiErrorKind.unauthorized;
  bool get isMissingLink => errorKind == ApiErrorKind.notFound && !hasData;

  ParentChild? get selectedChild {
    final snapshot = portal;
    if (snapshot == null) return null;
    if (selectedChildId == null) return snapshot.selected;
    for (final child in snapshot.children) {
      if (child.id == selectedChildId) return child;
    }
    return snapshot.selected;
  }

  ParentPortalState copyWith({
    ParentPortal? portal,
    String? selectedChildId,
    bool? isRefreshing,
    ApiErrorKind? errorKind,
    bool clearErrorKind = false,
    bool? isLoading,
    String? error,
    bool clearError = false,
  }) {
    return ParentPortalState(
      portal: portal ?? this.portal,
      selectedChildId: selectedChildId ?? this.selectedChildId,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      errorKind: clearErrorKind ? null : (errorKind ?? this.errorKind),
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

/// Parent portal ViewModel shared across the parent screens.
class ParentPortalViewModel extends BaseViewModel<ParentPortalState> {
  ParentPortalViewModel({
    ParentPortalRepository? repository,
    RequestCanceller? canceller,
  })  : _repository = repository ?? ParentPortalRepository(),
        _canceller = canceller ?? RequestCanceller(),
        super(const ParentPortalState(isLoading: true)) {
    load();
  }

  final ParentPortalRepository _repository;
  final RequestCanceller _canceller;

  ParentPortalRepository get repository => _repository;

  Future<void> load() async {
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      clearErrorKind: true,
    );
    try {
      final portal = await _repository.fetchPortal(
        studentId: state.selectedChildId,
        cancelToken: _canceller.tokenFor('portal'),
      );
      state = state.copyWith(
        isLoading: false,
        portal: portal,
        selectedChildId: portal.selected?.id ?? state.selectedChildId,
        clearError: true,
        clearErrorKind: true,
      );
    } on ApiException catch (error) {
      if (error.kind == ApiErrorKind.cancelled) return;
      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        error: error.message,
        errorKind: error.kind,
      );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        error: 'Failed to load the parent dashboard: $error',
        clearErrorKind: true,
      );
    }
  }

  /// Switches the selected child (session-scoped). The id is sent as a
  /// selector only; the server authorizes the parent link.
  Future<void> selectChild(String childId) async {
    if (childId.isEmpty || childId == state.selectedChildId) return;
    state = state.copyWith(selectedChildId: childId);
    await load();
  }

  Future<void> refresh() async {
    if (state.isRefreshing) return;
    state = state.copyWith(isRefreshing: true, clearError: true);
    try {
      final portal = await _repository.fetchPortal(
        studentId: state.selectedChildId,
        cancelToken: _canceller.tokenFor('portal'),
      );
      state = state.copyWith(
        isRefreshing: false,
        portal: portal,
        selectedChildId: portal.selected?.id ?? state.selectedChildId,
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
    } catch (error) {
      state = state.copyWith(
        isRefreshing: false,
        error: 'Failed to refresh the parent dashboard: $error',
        clearErrorKind: true,
      );
    }
  }

  @override
  void dispose() {
    _canceller.cancelAll();
    super.dispose();
  }
}

/// Shared provider for the parent portal snapshot.
final parentPortalProvider =
    StateNotifierProvider<ParentPortalViewModel, ParentPortalState>(
  (ref) => ParentPortalViewModel(),
);
