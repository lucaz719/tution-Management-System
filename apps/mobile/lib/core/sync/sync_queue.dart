import 'dart:async';
import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../database/app_database.dart';
import 'sync_models.dart';

/// Outcome of sending one queued mutation to the server.
enum ReplayOutcome {
  /// 2xx — mutation applied, drop from queue.
  applied,

  /// 409 or stale-version response — server wins, drop + record conflict.
  conflict,

  /// Network/5xx — keep queued, bump attempts.
  retryable,
}

/// Sends one replayed mutation. Implemented by the API layer; the queue
/// stays transport-agnostic so unit tests can fake it.
typedef MutationSender = Future<ReplayOutcome> Function(SyncOperation op);

/// Minimal persistence surface so the queue is unit-testable without sqlite.
abstract class SyncQueueStore {
  Future<List<SyncOperation>> pendingForUser(String userId);
  Future<bool> insert(SyncOperation op);
  Future<void> remove(String idempotencyKey);
  Future<void> bumpAttempts(String idempotencyKey, int attempts);
  Future<int> countForUser(String userId);
  Future<void> clearUser(String userId);
}

/// Drift-backed [SyncQueueStore].
class DriftSyncQueueStore implements SyncQueueStore {
  final AppDatabase db;
  DriftSyncQueueStore(this.db);

  @override
  Future<List<SyncOperation>> pendingForUser(String userId) async {
    final rows = await (db.select(db.syncQueue)
          ..where((t) => t.ownerUserId.equals(userId))
          ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
        .get();
    return [
      for (final r in rows)
        SyncOperation(
          idempotencyKey: r.idempotencyKey,
          ownerUserId: r.ownerUserId,
          method: r.method,
          path: r.path,
          bodyJson: r.bodyJson,
          attempts: r.attempts,
          createdAt: r.createdAt,
        ),
    ];
  }

  @override
  Future<bool> insert(SyncOperation op) async {
    final rowId = await db.into(db.syncQueue).insert(
          SyncQueueCompanion.insert(
            idempotencyKey: op.idempotencyKey,
            ownerUserId: op.ownerUserId,
            method: op.method,
            path: op.path,
            bodyJson: Value(op.bodyJson),
            attempts: Value(op.attempts),
            createdAt: op.createdAt,
          ),
          mode: InsertMode.insertOrIgnore,
        );
    return rowId != 0;
  }

  @override
  Future<void> remove(String idempotencyKey) async {
    await (db.delete(db.syncQueue)
          ..where((t) => t.idempotencyKey.equals(idempotencyKey)))
        .go();
  }

  @override
  Future<void> bumpAttempts(String idempotencyKey, int attempts) async {
    await (db.update(db.syncQueue)
          ..where((t) => t.idempotencyKey.equals(idempotencyKey)))
        .write(SyncQueueCompanion(attempts: Value(attempts)));
  }

  @override
  Future<int> countForUser(String userId) async {
    final rows = await (db.selectOnly(db.syncQueue)
          ..addColumns([db.syncQueue.id.count()])
          ..where(db.syncQueue.ownerUserId.equals(userId)))
        .getSingle();
    return rows.read(db.syncQueue.id.count()) ?? 0;
  }

  @override
  Future<void> clearUser(String userId) => db.clearUserData(userId);
}

/// Offline-first mutation queue (MOB-007).
///
/// * [enqueue] persists failed/offline mutations; same idempotency key twice
///   is a no-op (returns false).
/// * [drain] replays in FIFO order when online.
/// * Conflict rule: **server wins** — on [ReplayOutcome.conflict] the local
///   mutation is dropped, the server copy stays authoritative, and a
///   [SyncConflict] is recorded surfaced via [SyncStatus.conflicts] so the
///   UI can notify the user ("Your offline change to X was overwritten by
///   newer server data"). The queue never force-pushes over the server.
class SyncQueueService {
  final SyncQueueStore _store;
  final Uuid _uuid = const Uuid();
  final _conflictsController =
      StreamController<SyncConflict>.broadcast(sync: true);

  SyncQueueService(this._store);

  /// Local notifications of server-wins conflicts.
  Stream<SyncConflict> get conflicts => _conflictsController.stream;

  String newIdempotencyKey() => _uuid.v4();

  Future<bool> enqueue({
    required String ownerUserId,
    required String method,
    required String path,
    String? bodyJson,
    String? idempotencyKey,
    int createdAt = -1,
  }) =>
      _store.insert(SyncOperation(
        idempotencyKey: idempotencyKey ?? newIdempotencyKey(),
        ownerUserId: ownerUserId,
        method: method,
        path: path,
        bodyJson: bodyJson,
        createdAt:
            createdAt >= 0 ? createdAt : DateTime.now().millisecondsSinceEpoch,
      ));

  Future<int> pendingCount(String userId) => _store.countForUser(userId);

  /// Replay all queued mutations for [userId] in FIFO order.
  ///
  /// Stops at the first [ReplayOutcome.retryable] (keeps order; later ops
  /// may depend on earlier ones). Conflicts are dropped + recorded and do
  /// not stop the drain.
  Future<SyncDrainResult> drain(
    String userId,
    MutationSender send, {
    void Function(SyncConflict conflict)? onConflict,
  }) async {
    final pending = await _store.pendingForUser(userId);
    var replayed = 0;
    var failed = 0;
    final conflicts = <SyncConflict>[];
    for (final op in pending) {
      final outcome = await send(op);
      switch (outcome) {
        case ReplayOutcome.applied:
          await _store.remove(op.idempotencyKey);
          replayed++;
        case ReplayOutcome.conflict:
          await _store.remove(op.idempotencyKey);
          final conflict = SyncConflict(
            idempotencyKey: op.idempotencyKey,
            path: op.path,
            reason:
                'Server has newer data for ${op.path}; offline change discarded (server wins).',
            at: DateTime.now().millisecondsSinceEpoch,
          );
          conflicts.add(conflict);
          _conflictsController.add(conflict);
          onConflict?.call(conflict);
          replayed++;
        case ReplayOutcome.retryable:
          await _store.bumpAttempts(op.idempotencyKey, op.attempts + 1);
          failed++;
          return SyncDrainResult(
              replayed: replayed, failed: failed, conflicts: conflicts);
      }
    }
    return SyncDrainResult(
        replayed: replayed, failed: failed, conflicts: conflicts);
  }

  void dispose() => _conflictsController.close();
}

/// JSON helper for queue bodies.
String encodeBody(Map<String, dynamic> body) => jsonEncode(body);
