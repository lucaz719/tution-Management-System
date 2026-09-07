/// Authenticated repository backing the janitor portal.
///
/// All calls go through [ApiClient.dio] so the Better Auth session cookie is
/// sent automatically. Identity is derived server-side from that cookie; the
/// client never sends user, tenant or branch ids. GETs are the only retried
/// requests (shared retry interceptor); callers pass a [CancelToken]
/// (via [RequestCanceller]) for per-screen cancellation.
///
/// Verified endpoints (read-only inspection of `services/api/src`,
/// `routes/resources.ts` mounted at `/api/resources` in `server.ts`):
/// - `GET /api/resources/my-tasks` — Janitor-role worker view; tasks
///   assigned to the authenticated identity. Non-janitors get 403.
/// - `POST /api/resources/tasks/complete/:taskId` — resolves an assigned
///   task (owner or `manage_resource_tasks` permission); 409 when already
///   completed.
///
/// Missing (no dedicated endpoint; TODO when the backend adds it):
/// - start/begin transition (`PENDING` -> `IN_PROGRESS`). The viewmodel
///   performs assigned -> in-progress locally until the backend exposes it.
/// Failures surface as typed [ApiException]s — never demo data.
library;

import 'package:dio/dio.dart';
import 'package:tms_mobile/core/network/api_client.dart';
import 'package:tms_mobile/core/network/api_exception.dart';

import '../models/janitor_portal_dto.dart';

class JanitorPortalRepository {
  JanitorPortalRepository({Dio? dio}) : _dio = dio ?? ApiClient.instance.dio;

  final Dio _dio;

  static const String myTasksPath = '/api/resources/my-tasks';
  static String completeTaskPath(String taskId) =>
      '/api/resources/tasks/complete/$taskId';

  /// Tasks assigned to the authenticated janitor.
  Future<JanitorTaskList> fetchMyTasks({CancelToken? cancelToken}) async {
    try {
      final response =
          await _dio.get<dynamic>(myTasksPath, cancelToken: cancelToken);
      final body = response.data;
      if (body is! Map<String, dynamic>) {
        throw const ApiException(
          kind: ApiErrorKind.unknown,
          message: 'The maintenance task list returned an unexpected response.',
        );
      }
      return JanitorTaskList.fromJson(body);
    } on DioException catch (error) {
      throw _typed(error);
    }
  }

  /// Marks a task complete. Returns the completion timestamp reported by
  /// the server (falls back to client time when absent).
  Future<DateTime> completeTask(
    String taskId, {
    CancelToken? cancelToken,
  }) async {
    try {
      final response = await _dio.post<dynamic>(
        completeTaskPath(taskId),
        data: const <String, dynamic>{},
        cancelToken: cancelToken,
      );
      final body = response.data;
      if (body is Map<String, dynamic>) {
        final task = body['task'];
        if (task is Map<String, dynamic>) {
          final stamp = task['completionTimestamp'];
          if (stamp is String && stamp.isNotEmpty) {
            final parsed = DateTime.tryParse(stamp);
            if (parsed != null) return parsed;
          }
        }
      }
      return DateTime.now();
    } on DioException catch (error) {
      throw _typed(error);
    }
  }

  static ApiException _typed(DioException error) {
    final typed = error.error;
    if (typed is ApiException) return typed;
    return ApiException.fromDioException(error);
  }
}
