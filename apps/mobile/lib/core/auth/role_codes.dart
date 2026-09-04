/// Canonical role codes supported by the mobile application.
abstract final class RoleCodes {
  static const tenantAdmin = 'TENANT_ADMIN';
  static const branchAdmin = 'BRANCH_ADMIN';
  static const janitor = 'JANITOR';
  static const teacher = 'TEACHER';
  static const student = 'STUDENT';
  static const parent = 'PARENT';
}

const Map<String, String> _roleCodeByNormalizedName = {
  'TENANT ADMIN': RoleCodes.tenantAdmin,
  'TENANT_ADMIN': RoleCodes.tenantAdmin,
  'BRANCH ADMIN': RoleCodes.branchAdmin,
  'BRANCH_ADMIN': RoleCodes.branchAdmin,
  // Branch Manager is a product label, not a distinct permission role.
  'BRANCH MANAGER': RoleCodes.branchAdmin,
  'JANITOR': RoleCodes.janitor,
  'TEACHER': RoleCodes.teacher,
  'STUDENT': RoleCodes.student,
  'PARENT': RoleCodes.parent,
};

/// Converts a supported API role display name or role code to a mobile code.
///
/// Returns `null` for missing or unsupported roles so callers can reject them
/// rather than assigning a more privileged or unrelated default role.
String? normalizeRoleCode(String? role) {
  if (role == null) return null;

  final normalized = role.trim().replaceAll(RegExp(r'\s+'), ' ').toUpperCase();
  if (normalized.isEmpty) return null;

  return _roleCodeByNormalizedName[normalized];
}
