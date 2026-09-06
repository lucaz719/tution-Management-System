import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'connectivity_monitor.dart';
import 'sync_models.dart';
import 'sync_queue.dart';

/// Visible sync status widgets can watch: online/offline + syncing +
/// pending count + unacknowledged conflicts.
class SyncStatusNotifier extends StateNotifier<SyncStatus> {
  final Ref _ref;
  final SyncQueueService _queue;
  final String? Function()? _currentUserId;
  StreamSubscription<SyncConflict>? _conflictSub;
  ProviderSubscription<ConnectivityState>? _connSub;
  bool _draining = false;

  SyncStatusNotifier(this._ref, this._queue, {String? Function()? currentUserId})
      : _currentUserId = currentUserId,
        super(const SyncStatus()) {
    _conflictSub = _queue.conflicts.listen((c) {
      state = state.copyWith(conflicts: [...state.conflicts, c]);
    });
    _connSub = _ref.listen<ConnectivityState>(connectivityMonitorProvider,
        (prev, next) {
      state = state.copyWith(
          isOnline: next == ConnectivityState.online);
      if (next == ConnectivityState.online) drain();
    });
    state = state.copyWith(
        isOnline:
            _ref.read(connectivityMonitorProvider) ==
                ConnectivityState.online);
    refreshPending();
  }

  String? get _userId => _currentUserId?.call();

  Future<void> refreshPending() async {
    final id = _userId;
    if (id == null) {
      state = state.copyWith(pendingCount: 0);
      return;
    }
    state = state.copyWith(pendingCount: await _queue.pendingCount(id));
  }

  /// Replay queued mutations now (no-op while offline or already syncing).
  Future<SyncDrainResult?> drain({MutationSender? send}) async {
    if (_draining || !state.isOnline) return null;
    final id = _userId;
    if (id == null) return null;
    _draining = true;
    state = state.copyWith(isSyncing: true);
    try {
      // Default sender without a transport wired: treat everything as
      // retryable (stay queued) — the app layer injects the real sender.
      final result =
          await _queue.drain(id, send ?? ((_) async => ReplayOutcome.retryable));
      await refreshPending();
      return result;
    } finally {
      _draining = false;
      if (mounted) state = state.copyWith(isSyncing: false);
    }
  }

  /// Dismiss one conflict notification after the UI has shown it.
  void acknowledgeConflict(String idempotencyKey) {
    state = state.copyWith(
      conflicts: state.conflicts
          .where((c) => c.idempotencyKey != idempotencyKey)
          .toList(),
    );
  }

  void acknowledgeAllConflicts() {
    state = state.copyWith(conflicts: []);
  }

  @override
  void dispose() {
    _conflictSub?.cancel();
    _connSub?.close();
    super.dispose();
  }
}

/// Override in tests to bind the status to a fake queue/user.
final syncQueueServiceProvider = Provider<SyncQueueService>((ref) {
  throw UnimplementedError(
      'syncQueueServiceProvider must be overridden (app wires DriftSyncQueueStore at startup).');
});

/// Current-user id supplier (app wires to AuthState).
final syncCurrentUserIdProvider = Provider<String? Function()?>((ref) => null);

final syncStatusProvider =
    StateNotifierProvider<SyncStatusNotifier, SyncStatus>((ref) {
  final queue = ref.watch(syncQueueServiceProvider);
  final currentUser = ref.watch(syncCurrentUserIdProvider);
  return SyncStatusNotifier(ref, queue, currentUserId: currentUser);
});
