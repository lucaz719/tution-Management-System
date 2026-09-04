import 'package:tms_mobile/features/tenant_admin/models/tenant_admin_dashboard_models.dart';

/// Presentation-only data for the Tenant Admin dashboard MVP.
///
/// TODO(tenant-admin): Replace this class with repository-backed Riverpod
/// providers once the tenant admin dashboard API contract is available.
abstract final class TenantAdminDemoData {
  static const kpis = [
    TenantAdminKpi(
      label: 'Active branches',
      value: '4',
      supportingText: 'All operating normally',
    ),
    TenantAdminKpi(
      label: 'Staff',
      value: '86',
      supportingText: 'Across all branches',
    ),
    TenantAdminKpi(
      label: 'Students',
      value: '1,248',
      supportingText: 'Currently enrolled',
    ),
    TenantAdminKpi(
      label: 'Pending L2 approvals',
      value: '12',
      supportingText: 'Requires your review',
    ),
  ];

  static const branches = [
    TenantBranchOverview(
      name: 'Baneshwor',
      location: 'Kathmandu',
      staffCount: 28,
      studentCount: 412,
      pendingApprovals: 5,
    ),
    TenantBranchOverview(
      name: 'Lalitpur',
      location: 'Patan',
      staffCount: 21,
      studentCount: 306,
      pendingApprovals: 3,
    ),
    TenantBranchOverview(
      name: 'Bhaktapur',
      location: 'Suryabinayak',
      staffCount: 19,
      studentCount: 284,
      pendingApprovals: 2,
    ),
    TenantBranchOverview(
      name: 'Pokhara',
      location: 'Lakeside',
      staffCount: 18,
      studentCount: 246,
      pendingApprovals: 2,
    ),
  ];
}
