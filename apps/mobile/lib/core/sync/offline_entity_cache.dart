import 'dart:convert';

import 'package:drift/drift.dart';

import '../database/app_database.dart';

/// Per-user generic entity cache over the drift `entity_cache` table.
///
/// Scope rules (see OFFLINE_POLICY.md):
/// * every read/write is keyed by [ownerUserId] — cross-user reads are
///   impossible by construction;
/// * payloads are plain entity JSON only — NEVER credentials, session
///   cookies, or passwords (callers are responsible; this class has no
///   secret-shaped API but documents the ban);
/// * wiped per user on logout/401 via [AppDatabase.clearUserData] /
///   [clearOfflineCache].
class OfflineEntityCache {
  final AppDatabase db;
  OfflineEntityCache(this.db);

  Future<void> put({
    required String ownerUserId,
    required String entityType,
    required String entityId,
    required Map<String, dynamic> payload,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await db.into(db.entityCache).insertOnConflictUpdate(
          EntityCacheCompanion.insert(
            ownerUserId: ownerUserId,
            entityType: entityType,
            entityId: entityId,
            payloadJson: jsonEncode(payload),
            updatedAt: now,
          ),
        );
  }

  Future<Map<String, dynamic>?> get({
    required String ownerUserId,
    required String entityType,
    required String entityId,
  }) async {
    final row = await (db.select(db.entityCache)
          ..where((t) =>
              t.ownerUserId.equals(ownerUserId) &
              t.entityType.equals(entityType) &
              t.entityId.equals(entityId)))
        .getSingleOrNull();
    if (row == null) return null;
    return jsonDecode(row.payloadJson) as Map<String, dynamic>;
  }

  Future<List<Map<String, dynamic>>> listByType({
    required String ownerUserId,
    required String entityType,
  }) async {
    final rows = await (db.select(db.entityCache)
          ..where((t) =>
              t.ownerUserId.equals(ownerUserId) &
              t.entityType.equals(entityType))
          ..orderBy([(t) => OrderingTerm.desc(t.updatedAt)]))
        .get();
    return [
      for (final r in rows) jsonDecode(r.payloadJson) as Map<String, dynamic>
    ];
  }

  Future<void> remove({
    required String ownerUserId,
    required String entityType,
    required String entityId,
  }) async {
    await (db.delete(db.entityCache)
          ..where((t) =>
              t.ownerUserId.equals(ownerUserId) &
              t.entityType.equals(entityType) &
              t.entityId.equals(entityId)))
        .go();
  }
}
