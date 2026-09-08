/// Tenant admin ViewModel (MVVM): one authenticated dashboard load shared
/// by the tenant admin screens. Views stay thin; all IO, parsing and error
/// classification live in [TenantAdminRepository].
///
/// Tenant scope is server-derived from the Better Auth session cookie —
/// the client never sends a tenant identifier.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tms_mobile/core/network/api_exception.dart';
import 'package:tms_mobile/core/network/request_cancellation.dart';
import 'package:tms_mobile/core/providers/auth_provider.dart';
import 'package:tms_mobile/core/viewmodel/base_viewmodel.dart';

import '../data/tenant_admin_repository.dart';
import '../models/tenant_admin_dashboard.dart';

/// Shared tenant admin dashboard state.
@immutable
class TenantAdminState extends ViewModelState {
  const TenantAdminState({
    this.dashboard,
    this.isRefreshing = false,
    this.errorKind,
    super.error,
    super.isLoading,
  });

  final TenantAdminDashboard? dashboard;
  final bool isRefreshing;
  final ApiErrorKind? errorKind;

  bool get hasData => dashboard != null;
  bool get isOffline => errorKind == ApiErrorKind.noConnection;
  bool get isDenied =>
      errorKind == ApiErrorKind.forbidden ||
      errorKind == ApiErrorKind.unauthorized;

  TenantAdminState copyWith({
    TenantAdminDashboard? dashboard,
    bool clearDashboard = false,
    bool? isRefreshing,
    ApiErrorKind? errorKind,
    bool clearErrorKind = false,
    bool? isLoading,
    String? error,
    bool clearError = false,
  }) {
    return TenantAdminState(
      dashboard: clearDashboard ? null : (dashboard ?? this.dashboard),
      isRefreshing: isRefreshing ?? this.isRefreshing,
      errorKind: clearErrorKind ? null : (errorKind ?? this.errorKind),
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

/// Tenant admin ViewModel shared across the tenant admin screens.
class TenantAdminViewModel extends BaseViewModel<TenantAdminState> {
  TenantAdminViewModel({
    TenantAdminRepository? repository,
    RequestCanceller? canceller,
  })  : _repository = repository ?? TenantAdminRepository(),
        _canceller = canceller ?? RequestCanceller(),
        super(const TenantAdminState(isLoading: true)) {
    load();
  }

  final TenantAdminRepository _repository;
  final RequestCanceller _canceller;
  int _requestGeneration = 0;
  bool _disposed = false;

  TenantAdminRepository get repository => _repository;

  Future<void> load() async {
    final generation = ++_requestGeneration;
    _canceller.cancel('dashboard', 'Superseded by a newer dashboard request.');
    state = state.copyWith(
      isLoading: true,
      isRefreshing: false,
      clearError: true,
      clearErrorKind: true,
    );
    try {
      final dashboard = await _repository.fetchDashboard(
        cancelToken: _canceller.tokenFor('dashboard'),
      );
      if (!_isCurrent(generation)) return;
      state = state.copyWith(
        isLoading: false,
        dashboard: dashboard,
        clearError: true,
        clearErrorKind: true,
      );
    } on ApiException catch (error) {
      if (!_isCurrent(generation) || error.kind == ApiErrorKind.cancelled) {
        return;
      }
      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        error: error.message,
        errorKind: error.kind,
      );
    } catch (error) {
      if (!_isCurrent(generation)) return;
      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        error: 'Failed to load the tenant dashboard: $error',
        clearErrorKind: true,
      );
    }
  }

  Future<void> refresh() async {
    if (state.isRefreshing) return;
    final generation = ++_requestGeneration;
    _canceller.cancel('dashboard', 'Superseded by a newer dashboard request.');
    state = state.copyWith(isRefreshing: true, clearError: true);
    try {
      final dashboard = await _repository.fetchDashboard(
        cancelToken: _canceller.tokenFor('dashboard'),
      );
      if (!_isCurrent(generation)) return;
      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        dashboard: dashboard,
        clearError: true,
        clearErrorKind: true,
      );
    } on ApiException catch (error) {
      if (!_isCurrent(generation)) return;
      if (error.kind == ApiErrorKind.cancelled) {
        state = state.copyWith(isLoading: false, isRefreshing: false);
        return;
      }
      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        error: error.message,
        errorKind: error.kind,
      );
    } catch (error) {
      if (!_isCurrent(generation)) return;
      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        error: 'Failed to refresh the tenant dashboard: $error',
        clearErrorKind: true,
      );
    }
  }

  bool _isCurrent(int generation) =>
      !_disposed && generation == _requestGeneration;

  @override
  void dispose() {
    _disposed = true;
    _requestGeneration++;
    _canceller.cancelAll();
    _repository.dispose();
    super.dispose();
  }
}

String? _authenticatedTenantAdminSession(AuthState auth) =>
    auth.isAuthenticated ? auth.user?.id : null;

/// Session-scoped repository so dashboard snapshots cannot cross users.
final tenantAdminRepositoryProvider =
    Provider.autoDispose<TenantAdminRepository>((ref) {
  ref.watch(authProvider.select(_authenticatedTenantAdminSession));
  return TenantAdminRepository();
});

/// Shared only while tenant admin screens are mounted and for one
/// authenticated user.
final tenantAdminProvider =
    StateNotifierProvider.autoDispose<TenantAdminViewModel, TenantAdminState>(
  (ref) {
    ref.watch(authProvider.select(_authenticatedTenantAdminSession));
    return TenantAdminViewModel(
      repository: ref.watch(tenantAdminRepositoryProvider),
    );
  },
);
