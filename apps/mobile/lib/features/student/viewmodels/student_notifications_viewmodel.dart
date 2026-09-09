/// Student notifications inbox ViewModel (MVVM, MOB-104).
///
/// Items are the derived notices from `GET /api/users/me/student-portal`
/// (fee/homework/result/attendance/leave/certificate, newest first).
///
/// READ-STATE LIFECYCLE: no server-side mark-read endpoint exists — verified
/// read-only in `services/api/src/routes/communication.ts` (message-thread
/// read receipts only) and `routes/users.ts` (notifications are derived per
/// request with a computed `unread` flag). Read state is therefore tracked
/// locally in-memory per id, layered over the server `unread` flag.
/// TODO: when a `PATCH /api/users/me/notifications/:id` (or equivalent)
/// endpoint lands, persist [markRead]/[markAllRead] server-side there and
/// keep this local set as the optimistic layer.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tms_mobile/core/network/api_exception.dart';
import 'package:tms_mobile/core/network/request_cancellation.dart';
import 'package:tms_mobile/core/viewmodel/base_viewmodel.dart';

import '../data/student_id_calendar_notifications_repository.dart';
import '../models/student_portal_dto.dart';

/// One inbox row with effective read state applied.
@immutable
class InboxNotice {
  const InboxNotice({required this.raw, required this.isRead});

  final PortalNotification raw;
  final bool isRead;
}

@immutable
class StudentNotificationsState extends ViewModelState {
  const StudentNotificationsState({
    this.notices = const [],
    this.unreadOnly = false,
    this.isDenied = false,
    this.isOffline = false,
    super.error,
    super.isLoading,
  });

  final List<InboxNotice> notices;
  final bool unreadOnly;
  final bool isDenied;
  final bool isOffline;

  int get unreadCount => notices.where((notice) => !notice.isRead).length;

  List<InboxNotice> get visible =>
      unreadOnly ? notices.where((notice) => !notice.isRead).toList() : notices;

  bool get isEmpty => notices.isEmpty;

  StudentNotificationsState copyWith({
    List<InboxNotice>? notices,
    bool? unreadOnly,
    bool? isDenied,
    bool? isOffline,
    bool? isLoading,
    String? error,
    bool clearError = false,
  }) {
    return StudentNotificationsState(
      notices: notices ?? this.notices,
      unreadOnly: unreadOnly ?? this.unreadOnly,
      isDenied: isDenied ?? this.isDenied,
      isOffline: isOffline ?? this.isOffline,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class StudentNotificationsViewModel
    extends BaseViewModel<StudentNotificationsState> {
  StudentNotificationsViewModel({
    StudentIdCalendarNotificationsRepository? repository,
  })  : _repository = repository ?? StudentIdCalendarNotificationsRepository(),
        super(const StudentNotificationsState(isLoading: true)) {
    load();
  }

  final StudentIdCalendarNotificationsRepository _repository;
  final RequestCanceller _canceller = RequestCanceller();

  /// Ids the user has marked read locally this session.
  final Set<String> _localReadIds = <String>{};

  List<InboxNotice> _applyReadState(List<PortalNotification> raw) => [
        for (final notice in raw)
          InboxNotice(
            raw: notice,
            isRead: !notice.unread || _localReadIds.contains(notice.id),
          ),
      ];

  Future<void> load() async {
    _canceller.cancel('notifications');
    final token = _canceller.tokenFor('notifications');
    state = state.copyWith(
      isLoading: true,
      clearError: true,
      isDenied: false,
      isOffline: false,
    );
    try {
      final raw = await _repository.fetchNotifications(cancelToken: token);
      state = state.copyWith(
        isLoading: false,
        notices: _applyReadState(raw),
        clearError: true,
      );
    } on ApiException catch (e) {
      if (e.kind == ApiErrorKind.cancelled) return;
      state = state.copyWith(
        isLoading: false,
        error: e.message,
        isDenied: e.kind == ApiErrorKind.forbidden,
        isOffline: e.kind == ApiErrorKind.noConnection,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to load notifications: $e',
      );
    }
  }

  Future<void> refresh() => load();

  void setUnreadOnly(bool value) {
    state = state.copyWith(unreadOnly: value);
  }

  /// Marks one notice read (local; see file doc for the server TODO).
  void markRead(String id) {
    if (_localReadIds.add(id)) {
      state = state.copyWith(
        notices: [
          for (final notice in state.notices)
            if (notice.raw.id == id)
              InboxNotice(raw: notice.raw, isRead: true)
            else
              notice,
        ],
      );
    }
  }

  /// Marks every loaded notice read (local; see file doc for the server TODO).
  void markAllRead() {
    _localReadIds.addAll(state.notices.map((notice) => notice.raw.id));
    state = state.copyWith(
      notices: [
        for (final notice in state.notices)
          InboxNotice(raw: notice.raw, isRead: true),
      ],
    );
  }

  @override
  void dispose() {
    _canceller.cancelAll();
    super.dispose();
  }
}

final studentNotificationsViewModelProvider = StateNotifierProvider<
    StudentNotificationsViewModel, StudentNotificationsState>((ref) {
  return StudentNotificationsViewModel();
});
