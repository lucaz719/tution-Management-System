/// API-backed repository for the tenant admin portal.
///
/// Wired endpoints (verified in `services/api/src`, read-only here):
/// - `GET /api/tenant-admin/dashboard` — institution-wide snapshot:
///   active student/teacher counts, total overdue amount (NPR), pending
///   leave-request count, per-branch active student/staff summary.
///   Identity comes from the Better Auth session cookie; the server derives
///   tenant scope from the session and returns 403 for non-tenant-admins.
///   No client tenant identifier is ever sent.
///
/// Missing server-side (typed [ApiException] + TODO, never demo data):
/// - No per-branch pending-approval counts — branch tiles show staffing
///   and enrolment only.
/// - No tenant notification feed — the dashboard has no notifications
///   affordance until a server route exists.
/// - No tenant-scoped people/reports/approvals list endpoints behind
///   `GET /api/tenant-admin/*` — the home screen covers the dashboard
///   snapshot only.
library;

import 'package:dio/dio.dart';
import 'package:tms_mobile/core/network/api_client.dart';
import 'package:tms_mobile/core/network/api_exception.dart';

import '../models/tenant_admin_dashboard.dart';

class TenantAdminRepository {
  TenantAdminRepository({Dio? dio}) : _dio = dio ?? ApiClient.instance.dio;

  final Dio _dio;

  /// Institution-wide dashboard snapshot (identity from session cookie).
  static const String dashboardPath = '/api/tenant-admin/dashboard';

  /// Drops session-scoped snapshot data owned by this repository.
  void dispose() {}

  /// Loads the tenant admin dashboard snapshot.
  Future<TenantAdminDashboard> fetchDashboard({
    CancelToken? cancelToken,
  }) async {
    try {
      final response = await _dio.get<dynamic>(
        dashboardPath,
        cancelToken: cancelToken,
      );
      final body = response.data;
      if (body is! Map<String, dynamic>) {
        throw const ApiException(
          kind: ApiErrorKind.unknown,
          message: 'The tenant dashboard returned an unexpected response.',
        );
      }
      return TenantAdminDashboard.fromJson(body);
    } on DioException catch (error) {
      throw ApiException.from(error);
    }
  }
}
