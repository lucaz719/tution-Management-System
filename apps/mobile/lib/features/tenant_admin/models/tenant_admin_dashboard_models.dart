class TenantAdminKpi {
  const TenantAdminKpi({
    required this.label,
    required this.value,
    required this.supportingText,
  });

  final String label;
  final String value;
  final String supportingText;
}

class TenantBranchOverview {
  const TenantBranchOverview({
    required this.name,
    required this.location,
    required this.staffCount,
    required this.studentCount,
    required this.pendingApprovals,
  });

  final String name;
  final String location;
  final int staffCount;
  final int studentCount;
  final int pendingApprovals;
}
