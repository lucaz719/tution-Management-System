import 'package:flutter_riverpod/flutter_riverpod.dart';

/// A single pending mutation: one HTTP call to replay when back online.
class SyncOperation {
  /// Client-generated idempotency key (uuid v4). The server dedupes on this
  /// key, so enqueue + replay is safe under retries and process death.
  final String idempotencyKey;
  final String ownerUserId;
  final String method;
  final String path;
  final String? bodyJson;
  final int attempts;
  final int createdAt;

  const SyncOperation({
    required this.idempotencyKey,
    required this.ownerUserId,
    required this.method,
    required this.path,
    this.bodyJson,
    this.attempts = 0,
    required this.createdAt,
  });

  SyncOperation withAttempts(int value) => SyncOperation(
        idempotencyKey: idempotencyKey,
        ownerUserId: ownerUserId,
        method: method,
        path: path,
        bodyJson: bodyJson,
        attempts: value,
        createdAt: createdAt,
      );
}

/// Recorded when replay loses a conflict under the server-wins rule.
class SyncConflict {
  final String idempotencyKey;
  final String path;
  final String reason;
  final int at;

  const SyncConflict({
    required this.idempotencyKey,
    required this.path,
    required this.reason,
    required this.at,
  });
}

/// Result of one [SyncQueueService.drain] pass.
class SyncDrainResult {
  final int replayed;
  final int failed;
  final List<SyncConflict> conflicts;

  const SyncDrainResult({
    this.replayed = 0,
    this.failed = 0,
    this.conflicts = const [],
  });
}

/// Connectivity state. Chosen implementation: raw socket check (no plugin).
///
/// Why socket-check over connectivity_plus: it reports *usable* connectivity
/// (can we actually reach the API host), needs no native plugin (works on
/// all Flutter targets incl. desktop CI where connectivity_plus has no
/// implementation), and is trivially faked in tests.
enum ConnectivityState { online, offline }

final connectivityStateProvider =
    StateProvider<ConnectivityState>((ref) => ConnectivityState.online);

/// Visible sync status widgets can watch.
class SyncStatus {
  /// True when the device can reach the backend.
  final bool isOnline;

  /// True while a drain (replay pass) is in flight.
  final bool isSyncing;

  /// Number of queued mutations still awaiting replay.
  final int pendingCount;

  /// Unacknowledged server-wins conflicts (local copy overwritten).
  final List<SyncConflict> conflicts;

  const SyncStatus({
    this.isOnline = true,
    this.isSyncing = false,
    this.pendingCount = 0,
    this.conflicts = const [],
  });

  SyncStatus copyWith({
    bool? isOnline,
    bool? isSyncing,
    int? pendingCount,
    List<SyncConflict>? conflicts,
  }) =>
      SyncStatus(
        isOnline: isOnline ?? this.isOnline,
        isSyncing: isSyncing ?? this.isSyncing,
        pendingCount: pendingCount ?? this.pendingCount,
        conflicts: conflicts ?? this.conflicts,
      );
}
