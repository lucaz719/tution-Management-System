/// Branch manager portal DTOs parsed from the branch-admin API surface.
///
/// Verified read-only against `services/api/src/routes/branch-admin.ts`
/// (mounted at `/api/branch-admin` in `services/api/src/server.ts`),
/// `services/api/src/routes/leaves.ts` (mounted at `/api/leaves`) and the
/// petty-cash flow in `services/api/src/routes/finances.ts`
/// (mounted at `/api/finances`).
///
/// Identity comes from the Better Auth session cookie; the client never sends
/// user or tenant ids. `branchId` is only ever a server-validated scope hint:
/// the server rejects branches the caller does not manage.
library;

String _str(Object? value) => value is String ? value : '';

int _int(Object? value) {
  if (value is int) return value;
  if (value is double) return value.round();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}

double _dbl(Object? value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0;
  return 0;
}

DateTime? _date(Object? value) {
  if (value is String) return DateTime.tryParse(value);
  return null;
}

/// A branch the caller is allowed to manage.
class BranchRef {
  const BranchRef({required this.id, required this.name});

  final String id;
  final String name;

  factory BranchRef.fromJson(Map<String, dynamic> json) {
    return BranchRef(id: _str(json['id']), name: _str(json['name']));
  }
}

/// Attendance-style metric pair from the dashboard payload.
class BranchAttendanceMetric {
  const BranchAttendanceMetric({
    required this.present,
    required this.total,
    this.rate,
  });

  final int present;
  final int total;
  final int? rate;

  factory BranchAttendanceMetric.fromJson(Map<String, dynamic> json) {
    final rawRate = json['rate'];
    return BranchAttendanceMetric(
      present: _int(json['present']),
      total: _int(json['total']),
      rate: rawRate is num ? rawRate.round() : null,
    );
  }

  String get label {
    if (rate != null) return '$rate%';
    if (total == 0) return '—';
    return '$present / $total';
  }
}

/// Aggregated metrics from `GET /api/branch-admin/dashboard`.
class BranchMetrics {
  const BranchMetrics({
    required this.teacherAttendance,
    required this.studentAttendance,
    required this.blockedStudents,
    required this.pendingInvoices,
    required this.outstandingAmount,
    required this.pendingAppointments,
  });

  final BranchAttendanceMetric teacherAttendance;
  final BranchAttendanceMetric studentAttendance;
  final int blockedStudents;
  final int pendingInvoices;
  final double outstandingAmount;
  final int pendingAppointments;

  factory BranchMetrics.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic> section(Object? value) =>
        value is Map<String, dynamic> ? value : const {};
    return BranchMetrics(
      teacherAttendance:
          BranchAttendanceMetric.fromJson(section(json['teacherAttendance'])),
      studentAttendance:
          BranchAttendanceMetric.fromJson(section(json['studentAttendance'])),
      blockedStudents: _int(json['blockedStudents']),
      pendingInvoices: _int(json['pendingInvoices']),
      outstandingAmount: _dbl(json['outstandingAmount']),
      pendingAppointments: _int(json['pendingAppointments']),
    );
  }
}

/// One timetable row from the dashboard payload.
class BranchTimetableEntry {
  const BranchTimetableEntry({
    required this.id,
    required this.title,
    required this.detail,
    this.time,
    this.room,
    this.status,
  });

  final String id;
  final String title;
  final String detail;
  final DateTime? time;
  final String? room;
  final String? status;

  factory BranchTimetableEntry.fromJson(Map<String, dynamic> json) {
    return BranchTimetableEntry(
      id: _str(json['id']),
      title: _str(json['title']),
      detail: _str(json['detail']),
      time: _date(json['time']),
      room: json['room'] as String?,
      status: json['status'] as String?,
    );
  }
}

/// One resource check from the dashboard payload.
class BranchResourceEntry {
  const BranchResourceEntry({
    required this.id,
    required this.label,
    required this.detail,
    this.status,
    this.actionRequired = false,
    this.createdAt,
  });

  final String id;
  final String label;
  final String detail;
  final String? status;
  final bool actionRequired;
  final DateTime? createdAt;

  factory BranchResourceEntry.fromJson(Map<String, dynamic> json) {
    return BranchResourceEntry(
      id: _str(json['id']),
      label: _str(json['label']),
      detail: _str(json['detail']),
      status: json['status'] as String?,
      actionRequired: json['actionRequired'] == true,
      createdAt: _date(json['createdAt']),
    );
  }
}

/// One petty-cash request surfaced on the dashboard.
class BranchPettyCashEntry {
  const BranchPettyCashEntry({
    required this.id,
    required this.purpose,
    required this.amount,
    required this.status,
  });

  final String id;
  final String purpose;
  final double amount;
  final String status;

  factory BranchPettyCashEntry.fromJson(Map<String, dynamic> json) {
    return BranchPettyCashEntry(
      id: _str(json['id']),
      purpose: _str(json['purpose']),
      amount: _dbl(json['amount']),
      status: _str(json['status']),
    );
  }

  BranchPettyCashEntry copyWith({String? status}) {
    return BranchPettyCashEntry(
      id: id,
      purpose: purpose,
      amount: amount,
      status: status ?? this.status,
    );
  }
}

/// One appointment request surfaced on the dashboard.
class BranchAppointmentEntry {
  const BranchAppointmentEntry({
    required this.id,
    required this.parent,
    required this.student,
    required this.description,
    this.preferredTime,
  });

  final String id;
  final String parent;
  final String student;
  final String description;
  final DateTime? preferredTime;

  factory BranchAppointmentEntry.fromJson(Map<String, dynamic> json) {
    return BranchAppointmentEntry(
      id: _str(json['id']),
      parent: _str(json['parent']),
      student: _str(json['student']),
      description: _str(json['description']),
      preferredTime: _date(json['preferredTime']),
    );
  }
}

/// Consolidated dashboard from `GET /api/branch-admin/dashboard`.
class BranchDashboard {
  const BranchDashboard({
    required this.branches,
    required this.selectedBranch,
    required this.metrics,
    this.generatedAt,
    this.timetable = const [],
    this.resources = const [],
    this.pettyCash = const [],
    this.appointments = const [],
  });

  final List<BranchRef> branches;
  final BranchRef? selectedBranch;
  final BranchMetrics metrics;
  final DateTime? generatedAt;
  final List<BranchTimetableEntry> timetable;
  final List<BranchResourceEntry> resources;
  final List<BranchPettyCashEntry> pettyCash;
  final List<BranchAppointmentEntry> appointments;

  static List<T> _list<T>(
    Object? value,
    T Function(Map<String, dynamic>) parse,
  ) {
    if (value is! List) return const [];
    return value.whereType<Map<String, dynamic>>().map(parse).toList();
  }

  factory BranchDashboard.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? section(Object? value) =>
        value is Map<String, dynamic> ? value : null;
    final branches = _list(json['branches'], BranchRef.fromJson)
        .where((b) => b.id.isNotEmpty)
        .toList();
    final selected = section(json['selectedBranch']);
    return BranchDashboard(
      branches: branches,
      selectedBranch: selected == null ? null : BranchRef.fromJson(selected),
      metrics: BranchMetrics.fromJson(section(json['metrics']) ?? const {}),
      generatedAt: _date(json['generatedAt']),
      timetable: _list(json['timetable'], BranchTimetableEntry.fromJson),
      resources: _list(json['resources'], BranchResourceEntry.fromJson),
      pettyCash: _list(json['pettyCash'], BranchPettyCashEntry.fromJson),
      appointments:
          _list(json['appointments'], BranchAppointmentEntry.fromJson),
    );
  }
}

/// One leave request from `GET /api/leaves?level=L1`.
class BranchLeaveRequest {
  const BranchLeaveRequest({
    required this.id,
    required this.staffName,
    required this.branchId,
    required this.branchName,
    required this.leaveType,
    required this.status,
    required this.reason,
    this.startDate,
    this.endDate,
    this.remarks,
    this.createdAt,
  });

  final String id;
  final String staffName;
  final String branchId;
  final String branchName;
  final String leaveType;
  final String status;
  final String reason;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? remarks;
  final DateTime? createdAt;

  /// Only PENDING rows can be decided at L1 by a branch admin.
  bool get isPending => status == 'PENDING';

  factory BranchLeaveRequest.fromJson(Map<String, dynamic> json) {
    return BranchLeaveRequest(
      id: _str(json['id']),
      staffName: _str(json['staffName']),
      branchId: _str(json['branchId']),
      branchName: _str(json['branchName']),
      leaveType: _str(json['leaveType']),
      status: _str(json['status']),
      reason: _str(json['reason']),
      startDate: _date(json['startDate']),
      endDate: _date(json['endDate']),
      remarks: json['remarks'] as String?,
      createdAt: _date(json['createdAt']),
    );
  }

  BranchLeaveRequest copyWith({String? status, String? remarks}) {
    return BranchLeaveRequest(
      id: id,
      staffName: staffName,
      branchId: branchId,
      branchName: branchName,
      leaveType: leaveType,
      status: status ?? this.status,
      reason: reason,
      startDate: startDate,
      endDate: endDate,
      remarks: remarks ?? this.remarks,
      createdAt: createdAt,
    );
  }
}
