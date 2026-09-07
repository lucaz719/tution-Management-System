import 'dart:async';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tms_mobile/core/database/app_database.dart';
import 'package:tms_mobile/core/network/api_client.dart';
import 'package:tms_mobile/core/providers/auth_provider.dart';
import 'package:tms_mobile/features/auth/data/auth_service.dart';

/// Session-end wipe of per-user offline data (logout + 401 path).
///
/// Contract under test:
/// * logout()/forceLogout() capture the user id BEFORE clearing state, then
///   wipe only that user's rows via [clearOfflineCache];
/// * the 401 path (ApiClient.clearAuth + onSessionInvalidated) wipes exactly
///   once — repeat session-end calls are no-ops;
/// * a null/empty user id skips the wipe without crashing.
class _Stub401Adapter implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      '{"error":"session expired"}',
      401,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType]
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

AuthUser _user(String id) => AuthUser(
      id: id,
      email: '$id@test.example',
      firstName: 'Test',
      lastName: 'User',
      role: 'TEACHER',
    );

/// A notifier whose async session-restore has already settled, so seeded
/// state cannot be overwritten mid-test.
Future<AuthNotifier> _settledNotifier() async {
  final notifier = AuthNotifier();
  await Future<void>.delayed(const Duration(milliseconds: 50));
  return notifier;
}

Future<AppDatabase> _registeredDb() async {
  final db = AppDatabase.forTesting(NativeDatabase.memory());
  await registerOfflineDatabase(db);
  return db;
}

Future<void> _seedRows(AppDatabase db, String userId) async {
  await db.into(db.entityCache).insert(
        EntityCacheCompanion.insert(
          ownerUserId: userId,
          entityType: 'tasks',
          entityId: 'e-$userId',
          payloadJson: '{"id":"e-$userId"}',
          updatedAt: 1,
        ),
      );
  await db.into(db.syncQueue).insert(
        SyncQueueCompanion.insert(
          idempotencyKey: 'k-$userId',
          ownerUserId: userId,
          method: 'POST',
          path: '/api/tasks',
          createdAt: 1,
        ),
      );
}

Future<int> _rowCount(AppDatabase db, String userId) async {
  final cache = await (db.select(db.entityCache)
        ..where((t) => t.ownerUserId.equals(userId)))
      .get();
  final queue = await (db.select(db.syncQueue)
        ..where((t) => t.ownerUserId.equals(userId)))
      .get();
  return cache.length + queue.length;
}

/// The 401 interceptor fires forceLogout without awaiting it; poll until the
/// async wipe lands (or time out and let the expectation fail).
Future<void> _waitForWipe(AppDatabase db, String userId) async {
  for (var i = 0; i < 200; i++) {
    if (await _rowCount(db, userId) == 0) return;
    await Future<void>.delayed(const Duration(milliseconds: 10));
  }
}

void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    SharedPreferences.setMockInitialValues({});
  });

  tearDown(() {
    ApiClient.onSessionInvalidated = null;
  });

  test('logout wipes only that user\'s offline rows', () async {
    final db = await _registeredDb();
    addTearDown(db.close);
    final notifier = await _settledNotifier();
    addTearDown(notifier.dispose);

    notifier.seedAuthenticatedForTesting(_user('user-a'));
    await _seedRows(db, 'user-a');
    await _seedRows(db, 'user-b');

    await notifier.logout();

    expect(await _rowCount(db, 'user-a'), 0);
    expect(await _rowCount(db, 'user-b'), 2);
    expect(notifier.state.isAuthenticated, isFalse);
    expect(notifier.state.user, isNull);
  });

  test('401 response triggers per-user wipe via onSessionInvalidated',
      () async {
    final db = await _registeredDb();
    addTearDown(db.close);
    final notifier = await _settledNotifier();
    addTearDown(notifier.dispose);

    notifier.seedAuthenticatedForTesting(_user('user-a'));
    await _seedRows(db, 'user-a');
    await _seedRows(db, 'user-b');

    // Same wiring as app_router.dart: a 401 drives forceLogout.
    ApiClient.onSessionInvalidated = () => notifier.forceLogout();

    final dio = ApiClient.buildDio(
      baseUrl: 'https://test.invalid',
      adapter: _Stub401Adapter(),
    );
    await expectLater(dio.get('/api/tasks'), throwsA(isA<DioException>()));
    await _waitForWipe(db, 'user-a');

    expect(await _rowCount(db, 'user-a'), 0);
    expect(await _rowCount(db, 'user-b'), 2);
    expect(notifier.state.isAuthenticated, isFalse);
    expect(notifier.state.user, isNull);
  });

  test('logout and forceLogout with no user skip wipe without crashing',
      () async {
    final db = await _registeredDb();
    addTearDown(db.close);
    final notifier = await _settledNotifier();
    addTearDown(notifier.dispose);

    expect(notifier.state.user, isNull);
    await _seedRows(db, 'user-b');

    await notifier.logout();
    await notifier.forceLogout();

    expect(await _rowCount(db, 'user-b'), 2);
    expect(notifier.state.isAuthenticated, isFalse);
  });

  test('repeat session end wipes exactly once, other users untouched',
      () async {
    final db = await _registeredDb();
    addTearDown(db.close);
    final notifier = await _settledNotifier();
    addTearDown(notifier.dispose);

    notifier.seedAuthenticatedForTesting(_user('user-a'));
    await _seedRows(db, 'user-a');
    await _seedRows(db, 'user-b');

    await notifier.forceLogout();
    // Duplicate 401s / logout-after-expiry: user is now null, so these
    // must be safe no-ops that wipe nothing (exactly-once).
    await notifier.forceLogout();
    await notifier.logout();

    expect(await _rowCount(db, 'user-a'), 0);
    expect(await _rowCount(db, 'user-b'), 2);
    expect(notifier.state.isAuthenticated, isFalse);
  });
}
