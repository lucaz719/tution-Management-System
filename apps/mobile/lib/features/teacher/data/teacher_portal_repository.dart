/// Authenticated repository backing the teacher portal.
///
/// All calls go through [ApiClient.dio] so the Better Auth session cookie is
/// sent automatically. Identity is derived server-side from that cookie; the
/// client never sends user, tenant or branch ids on reads. GETs are the only
/// retried requests (shared retry interceptor); callers pass a [CancelToken]
/// (via [RequestCanceller]) for per-screen cancellation.
///
/// Verified endpoints (read-only inspection of `services/api/src`):
/// - `GET /api/teacher/workspace` — home, timetable source, leave list,
///   stamps, stats (`routes/teacher.ts`; `/dashboard` 307-redirects here).
/// - `POST /api/leaves/request` — leave submit (`routes/leaves.ts`).
/// - `POST /api/attendance/in|out` — geo-attendance stamps; the server
///   re-validates GPS accuracy, branch geofence and pending daily updates
///   and is authoritative (`routes/attendance.ts`).
/// - `POST /api/teacher/session/:sessionId/update` — daily lesson update
///   (`routes/teacher.ts`).
///
/// Missing (no dedicated endpoint; surfaced via workspace instead):
/// - standalone leave-status list, standalone timetable feed, geo-config
///   feed. TODO when the backend adds them.
/// Failures surface as typed [ApiException]s — never demo data.
library;

import 'package:dio/dio.dart';
import 'package:tms_mobile/core/network/api_client.dart';
import 'package:tms_mobile/core/network/api_exception.dart';

import '../models/teacher_portal_dto.dart';

class TeacherPortalRepository {
  TeacherPortalRepository({Dio? dio}) : _dio = dio ?? ApiClient.instance.dio;

  final Dio _dio;

  static const String workspacePath = '/api/teacher/workspace';
  static const String leaveRequestPath = '/api/leaves/request';
  static const String geoInPath = '/api/attendance/in';
  static const String geoOutPath = '/api/attendance/out';
  static String sessionUpdatePath(String sessionId) =>
      '/api/teacher/session/$sessionId/update';

  /// Consolidated workspace payload (home + timetable source + leaves).
  Future<TeacherWorkspace> fetchWorkspace({CancelToken? cancelToken}) async {
    try {
      final response =
          await _dio.get<dynamic>(workspacePath, cancelToken: cancelToken);
      final body = response.data;
      if (body is! Map<String, dynamic>) {
        throw const ApiException(
          kind: ApiErrorKind.unknown,
          message: 'The teacher workspace returned an unexpected response.',
        );
      }
      return TeacherWorkspace.fromJson(body);
    } on DioException catch (error) {
      throw _typed(error);
    }
  }

  /// Submits a leave request. Status is read back from the workspace
  /// `leaves` array (no standalone status endpoint exists).
  Future<TeacherLeaveEntry> submitLeave({
    required String branchId,
    required String leaveType,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
    CancelToken? cancelToken,
  }) async {
    try {
      final response = await _dio.post<dynamic>(
        leaveRequestPath,
        data: {
          'branchId': branchId,
          'leaveType': leaveType,
          'startDate': startDate.toIso8601String(),
          'endDate': endDate.toIso8601String(),
          'reason': reason,
        },
        cancelToken: cancelToken,
      );
      final body = response.data;
      final leave = body is Map<String, dynamic> ? body['leave'] : null;
      if (leave is! Map<String, dynamic>) {
        throw const ApiException(
          kind: ApiErrorKind.unknown,
          message: 'The leave request returned an unexpected response.',
        );
      }
      return TeacherLeaveEntry.fromJson(leave);
    } on DioException catch (error) {
      throw _typed(error);
    }
  }

  /// Marks geo-attendance IN. Client coordinates are UX hints only; the
  /// server re-validates the geofence and is authoritative for the record.
  Future<Map<String, dynamic>> markGeoIn({
    required String branchId,
    required double latitude,
    required double longitude,
    required double gpsAccuracy,
    CancelToken? cancelToken,
  }) async {
    return _geoStamp(
      path: geoInPath,
      branchId: branchId,
      latitude: latitude,
      longitude: longitude,
      gpsAccuracy: gpsAccuracy,
      cancelToken: cancelToken,
    );
  }

  /// Marks geo-attendance OUT (same authority rules as [markGeoIn]).
  Future<Map<String, dynamic>> markGeoOut({
    required String branchId,
    required double latitude,
    required double longitude,
    required double gpsAccuracy,
    CancelToken? cancelToken,
  }) async {
    return _geoStamp(
      path: geoOutPath,
      branchId: branchId,
      latitude: latitude,
      longitude: longitude,
      gpsAccuracy: gpsAccuracy,
      cancelToken: cancelToken,
    );
  }

  Future<Map<String, dynamic>> _geoStamp({
    required String path,
    required String branchId,
    required double latitude,
    required double longitude,
    required double gpsAccuracy,
    CancelToken? cancelToken,
  }) async {
    try {
      final response = await _dio.post<dynamic>(
        path,
        data: {
          'branchId': branchId,
          'latitude': latitude,
          'longitude': longitude,
          'gpsAccuracy': gpsAccuracy,
        },
        cancelToken: cancelToken,
      );
      final body = response.data;
      if (body is! Map<String, dynamic>) {
        throw const ApiException(
          kind: ApiErrorKind.unknown,
          message: 'Attendance marking returned an unexpected response.',
        );
      }
      return body;
    } on DioException catch (error) {
      throw _typed(error);
    }
  }

  /// Submits the daily lesson update for a session.
  Future<void> submitSessionUpdate({
    required String sessionId,
    required String updateContent,
    CancelToken? cancelToken,
  }) async {
    try {
      await _dio.post<dynamic>(
        sessionUpdatePath(sessionId),
        data: {'updateContent': updateContent},
        cancelToken: cancelToken,
      );
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
