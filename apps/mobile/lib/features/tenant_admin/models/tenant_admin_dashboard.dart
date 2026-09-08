/// Tenant admin dashboard DTOs mirroring `GET /api/tenant-admin/dashboard`
/// (see `services/api/src/routes/tenant-admin.ts`, read-only here).
///
/// Identity comes from the Better Auth session cookie; the server derives
/// `tenantId` from the session and returns 403 unless the signed-in user
/// has the Tenant Admin role. No client-passed tenant identifier is ever
/// sent or trusted.
library;

int _int(dynamic value) =>
    value is num ? value.toInt() : int.tryParse('$value') ?? 0;

double _num(dynamic value) =>
    value is num ? value.toDouble() : double.tryParse('$value') ?? 0;

String _str(dynamic value, [String fallback = '']) =>
    value == null ? fallback : '$value';

/// One branch row in the dashboard payload (`branchSummary[]`).
class TenantBranchSummary {
  const TenantBranchSummary({
    required this.branchId,
    required this.branchName,
    required this.activeStudents,
    required this.staffCount,
  });

  final String branchId;
  final String branchName;
  final int activeStudents;
  final int staffCount;

  factory TenantBranchSummary.fromJson(Map<String, dynamic> json) =>
      TenantBranchSummary(
        branchId: _str(json['branchId']),
        branchName: _str(json['branchName'], 'Branch'),
        activeStudents: _int(json['activeStudents']),
        staffCount: _int(json['staffCount']),
      );
}

/// Institution-wide dashboard snapshot for the signed-in tenant.
class TenantAdminDashboard {
  const TenantAdminDashboard({
    required this.activeStudentsCount,
    required this.activeTeachersCount,
    required this.totalOverdueAmountNpr,
    required this.pendingLeaveRequestsCount,
    required this.branchSummary,
  });

  final int activeStudentsCount;
  final int activeTeachersCount;
  final double totalOverdueAmountNpr;
  final int pendingLeaveRequestsCount;
  final List<TenantBranchSummary> branchSummary;

  factory TenantAdminDashboard.fromJson(Map<String, dynamic> json) =>
      TenantAdminDashboard(
        activeStudentsCount: _int(json['activeStudentsCount']),
        activeTeachersCount: _int(json['activeTeachersCount']),
        totalOverdueAmountNpr: _num(json['totalOverdueAmountNpr']),
        pendingLeaveRequestsCount: _int(json['pendingLeaveRequestsCount']),
        branchSummary: [
          for (final item in (json['branchSummary'] as List? ?? const []))
            if (item is Map<String, dynamic>)
              TenantBranchSummary.fromJson(item),
        ],
      );

  /// Total active staff summed across branches.
  int get totalStaff =>
      branchSummary.fold(0, (sum, branch) => sum + branch.staffCount);
}
