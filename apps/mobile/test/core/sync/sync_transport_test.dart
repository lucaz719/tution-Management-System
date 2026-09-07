import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tms_mobile/core/sync/connectivity_monitor.dart';
import 'package:tms_mobile/core/sync/sync_models.dart';
import 'package:tms_mobile/core/sync/sync_queue.dart';
import 'package:tms_mobile/core/sync/sync_status_provider.dart';

/// In-memory fake so provider wiring is tested without sqlite.
class FakeSyncQueueStore implements SyncQueueStore {
  final Map<String, SyncOperation> rows = {};

  @override
  Future<bool> insert(SyncOperation op) async {
    if (rows.containsKey(op.idempotencyKey)) return false;
    rows[op.idempotencyKey] = op;
    return true;
  }

  @override
  Future<List<SyncOperation>> pendingForUser(String userId) async {
    final list = rows.values.where((o) => o.ownerUserId == userId).toList();
    list.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return list;
  }

  @override
  Future<void> remove(String key) async {
    rows.remove(key);
  }

  @override
  Future<void> bumpAttempts(String key, int attempts) async {
    final op = rows[key];
    if (op != null) rows[key] = op.withAttempts(attempts);
  }

  @override
  Future<int> countForUser(String userId) async =>
      rows.values.where((o) => o.ownerUserId == userId).length;

  @override
  Future<void> clearUser(String userId) async {
    rows.removeWhere((_, o) => o.ownerUserId == userId);
  }
}

SyncOperation queuedOp(String key, String user) => SyncOperation(
      idempotencyKey: key,
      ownerUserId: user,
      method: 'POST',
      path: '/api/tasks',
      bodyJson: '{"title":"offline edit"}',
      createdAt: 1,
    );

/// Test container mirroring the main.dart startup overrides: a queue
/// service, a current-user supplier, a mutation sender, and controllable
/// connectivity (no timers — autostart off).
ProviderContainer testContainer({
  required FakeSyncQueueStore store,
  String? Function()? currentUserId,
  MutationSender? sender,
  ConnectivityState connectivity = ConnectivityState.online,
}) {
  final container = ProviderContainer(
    overrides: [
      syncQueueServiceProvider.overrideWithValue(SyncQueueService(store)),
      syncCurrentUserIdProvider.overrideWithValue(currentUserId),
      if (sender != null) mutationSenderProvider.overrideWithValue(sender),
      connectivityMonitorProvider.overrideWith((ref) {
        final monitor = ConnectivityMonitor(
          check: () async => connectivity == ConnectivityState.online,
          autostart: false,
        );
        monitor.setForTest(connectivity);
        return monitor;
      }),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

void main() {
  group('startup provider defaults', () {
    test('queue provider throws until the app overrides it', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      expect(
        () => container.read(syncQueueServiceProvider),
        throwsUnimplementedError,
      );
    });

    test('current-user supplier defaults to null (logged out)', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      expect(container.read(syncCurrentUserIdProvider), isNull);
    });

    test('mutation sender has a default (ApiClient transport)', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      expect(container.read(mutationSenderProvider), isA<MutationSender>());
    });
  });

  group('startup overrides', () {
    test('status reflects the overridden queue + user', () async {
      final store = FakeSyncQueueStore();
      await store.insert(queuedOp('k1', 'u1'));
      final container = testContainer(
        store: store,
        currentUserId: () => 'u1',
      );

      final notifier = container.read(syncStatusProvider.notifier);
      await notifier.refreshPending();

      expect(container.read(syncStatusProvider).pendingCount, 1);
    });

    test('null user (logged out) shows zero pending', () async {
      final store = FakeSyncQueueStore();
      await store.insert(queuedOp('k1', 'u1'));
      final container = testContainer(store: store, currentUserId: null);

      final notifier = container.read(syncStatusProvider.notifier);
      await notifier.refreshPending();

      expect(container.read(syncStatusProvider).pendingCount, 0);
      expect(await notifier.drain(), isNull);
    });
  });

  group('drain replays queued ops', () {
    test('drain() with the wired sender applies and clears the op', () async {
      final store = FakeSyncQueueStore();
      await store.insert(queuedOp('k1', 'u1'));
      SyncOperation? replayed;
      final container = testContainer(
        store: store,
        currentUserId: () => 'u1',
        sender: (op) async {
          replayed = op;
          return ReplayOutcome.applied;
        },
      );

      final notifier = container.read(syncStatusProvider.notifier);
      final result = await notifier.drain();

      expect(result?.replayed, 1);
      expect(replayed?.path, '/api/tasks');
      expect(replayed?.bodyJson, '{"title":"offline edit"}');
      expect(await store.countForUser('u1'), 0);
      expect(container.read(syncStatusProvider).pendingCount, 0);
    });

    test('going back online auto-drains the queue', () async {
      final store = FakeSyncQueueStore();
      await store.insert(queuedOp('k1', 'u1'));
      final container = testContainer(
        store: store,
        currentUserId: () => 'u1',
        sender: (_) async => ReplayOutcome.applied,
        connectivity: ConnectivityState.offline,
      );

      final notifier = container.read(syncStatusProvider.notifier);
      await notifier.refreshPending();
      expect(container.read(syncStatusProvider).pendingCount, 1);
      expect(container.read(syncStatusProvider).isOnline, isFalse);

      // Reconnect — the status notifier drains on the transition.
      container
          .read(connectivityMonitorProvider.notifier)
          .setForTest(ConnectivityState.online);

      // Drain runs unawaited off the listener; poll until it lands.
      for (var i = 0; i < 100 && await store.countForUser('u1') != 0; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 20));
      }

      expect(await store.countForUser('u1'), 0);
    });
  });
}
