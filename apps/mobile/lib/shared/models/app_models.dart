import 'package:flutter/material.dart';

enum StatusChipVariant { success, warning, error, info, gold }

enum ScheduleAttendanceStatus { present, absent, upcoming }

extension ScheduleAttendanceStatusX on ScheduleAttendanceStatus {
  String get label => switch (this) {
        ScheduleAttendanceStatus.present => 'Present',
        ScheduleAttendanceStatus.absent => 'Absent',
        ScheduleAttendanceStatus.upcoming => 'Upcoming',
      };

  StatusChipVariant get chipVariant => switch (this) {
        ScheduleAttendanceStatus.present => StatusChipVariant.success,
        ScheduleAttendanceStatus.absent => StatusChipVariant.error,
        ScheduleAttendanceStatus.upcoming => StatusChipVariant.info,
      };
}

enum InvoiceStatus { paid, due, overdue }

extension InvoiceStatusX on InvoiceStatus {
  String get label => switch (this) {
        InvoiceStatus.paid => 'PAID',
        InvoiceStatus.due => 'DUE',
        InvoiceStatus.overdue => 'OVERDUE',
      };

  StatusChipVariant get chipVariant => switch (this) {
        InvoiceStatus.paid => StatusChipVariant.success,
        InvoiceStatus.due => StatusChipVariant.warning,
        InvoiceStatus.overdue => StatusChipVariant.error,
      };

  bool get isActionable => this != InvoiceStatus.paid;
}

enum AttendanceStatus { present, absent, excused, noClass }

extension AttendanceStatusX on AttendanceStatus {
  String get label => switch (this) {
        AttendanceStatus.present => 'Present today',
        AttendanceStatus.absent => 'Absent today',
        AttendanceStatus.excused => 'Excused leave',
        AttendanceStatus.noClass => 'No class',
      };

  String get shortLabel => switch (this) {
        AttendanceStatus.present => 'Present',
        AttendanceStatus.absent => 'Absent',
        AttendanceStatus.excused => 'Excused',
        AttendanceStatus.noClass => 'No class',
      };

  StatusChipVariant get chipVariant => switch (this) {
        AttendanceStatus.present => StatusChipVariant.success,
        AttendanceStatus.absent => StatusChipVariant.error,
        AttendanceStatus.excused => StatusChipVariant.warning,
        AttendanceStatus.noClass => StatusChipVariant.info,
      };

  IconData get icon => switch (this) {
        AttendanceStatus.present => Icons.check_circle_rounded,
        AttendanceStatus.absent => Icons.cancel_rounded,
        AttendanceStatus.excused => Icons.remove_circle_rounded,
        AttendanceStatus.noClass => Icons.event_busy_rounded,
      };
}

enum AttendanceViewMode { calendar, list }

class Announcement {
  const Announcement({
    required this.title,
    required this.branch,
    required this.publishedAt,
  });

  final String title;
  final String branch;
  final DateTime publishedAt;

  bool isNew(DateTime referenceTime) {
    return referenceTime.difference(publishedAt).inHours < 24;
  }
}

class ScheduleEntry {
  const ScheduleEntry({
    required this.time,
    required this.subject,
    required this.teacher,
    required this.room,
    required this.status,
  });

  final String time;
  final String subject;
  final String teacher;
  final String room;
  final ScheduleAttendanceStatus status;
}

class TimetableDay {
  const TimetableDay({
    required this.dayLabel,
    required this.classes,
  });

  final String dayLabel;
  final List<ScheduleEntry> classes;
}

class InvoiceBreakdownItem {
  const InvoiceBreakdownItem({
    required this.label,
    required this.amount,
  });

  final String label;
  final double amount;
}

class Invoice {
  const Invoice({
    required this.monthLabel,
    required this.amount,
    required this.dueDate,
    required this.status,
    required this.breakdown,
  });

  final String monthLabel;
  final double amount;
  final DateTime dueDate;
  final InvoiceStatus status;
  final List<InvoiceBreakdownItem> breakdown;
}

class StudentProfile {
  const StudentProfile({
    required this.id,
    required this.name,
    required this.grade,
    required this.branch,
    required this.rollNo,
    required this.enrollmentId,
    required this.academicYear,
    required this.validityDate,
    this.photoUrl,
  });

  final String id;
  final String name;
  final String grade;
  final String branch;
  final String rollNo;
  final String enrollmentId;
  final String academicYear;
  final DateTime validityDate;
  final String? photoUrl;

  String get firstName => name.split(' ').first;
}

class StudentPortalData {
  const StudentPortalData({
    required this.profile,
    required this.todaysSchedule,
    required this.weeklySchedule,
    required this.invoices,
    required this.announcements,
  });

  final StudentProfile profile;
  final List<ScheduleEntry> todaysSchedule;
  final List<TimetableDay> weeklySchedule;
  final List<Invoice> invoices;
  final List<Announcement> announcements;

  double get totalOutstanding {
    return invoices
        .where((Invoice invoice) => invoice.status != InvoiceStatus.paid)
        .fold<double>(0, (double sum, Invoice invoice) => sum + invoice.amount);
  }

  InvoiceStatus get overallFeeStatus {
    final bool hasOverdue = invoices
        .any((Invoice invoice) => invoice.status == InvoiceStatus.overdue);
    if (hasOverdue) {
      return InvoiceStatus.overdue;
    }

    final bool hasDue =
        invoices.any((Invoice invoice) => invoice.status == InvoiceStatus.due);
    if (hasDue) {
      return InvoiceStatus.due;
    }

    return InvoiceStatus.paid;
  }

  Invoice? get nextDueInvoice {
    final List<Invoice> actionable = invoices
        .where((Invoice invoice) => invoice.status != InvoiceStatus.paid)
        .toList()
      ..sort((Invoice a, Invoice b) => a.dueDate.compareTo(b.dueDate));
    if (actionable.isEmpty) {
      return null;
    }
    return actionable.first;
  }
}

class AttendanceRecord {
  const AttendanceRecord({
    required this.date,
    required this.subject,
    required this.status,
  });

  final DateTime date;
  final String subject;
  final AttendanceStatus status;
}

class MonthlyAttendanceSummary {
  const MonthlyAttendanceSummary({
    required this.month,
    required this.records,
  });

  final DateTime month;
  final List<AttendanceRecord> records;

  int get presentCount => records
      .where((AttendanceRecord record) =>
          record.status == AttendanceStatus.present)
      .length;

  int get absentCount => records
      .where(
          (AttendanceRecord record) => record.status == AttendanceStatus.absent)
      .length;

  int get excusedCount => records
      .where((AttendanceRecord record) =>
          record.status == AttendanceStatus.excused)
      .length;

  int get countedDays => presentCount + absentCount + excusedCount;

  double get attendanceRatio {
    if (countedDays == 0) {
      return 0;
    }
    return presentCount / countedDays;
  }
}

class ParentChildPortalData {
  const ParentChildPortalData({
    required this.child,
    required this.todayAttendance,
    required this.lastUpdated,
    required this.outstandingBalance,
    required this.dueDate,
    required this.remainingClasses,
    required this.invoices,
    required this.announcements,
    required this.monthlyAttendance,
  });

  final StudentProfile child;
  final AttendanceStatus todayAttendance;
  final DateTime lastUpdated;
  final double outstandingBalance;
  final DateTime dueDate;
  final List<ScheduleEntry> remainingClasses;
  final List<Invoice> invoices;
  final List<Announcement> announcements;
  final List<MonthlyAttendanceSummary> monthlyAttendance;
}
