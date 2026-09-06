class TeacherClassSession {
  const TeacherClassSession({
    required this.id,
    required this.subject,
    required this.room,
    required this.branch,
    required this.enrolledCount,
    required this.status,
    required this.scheduledStart,
    required this.scheduledEnd,
  });

  final String id;
  final String subject;
  final String room;
  final String branch;
  final int enrolledCount;
  final ClassSessionStatus status;
  final DateTime scheduledStart;
  final DateTime scheduledEnd;
}

class UpdateLogItem {
  const UpdateLogItem({required this.id, required this.className});

  final String id;
  final String className;
}

class AttendanceStamp {
  const AttendanceStamp({required this.kind, required this.at});

  final AttendanceStampKind kind;
  final DateTime at;

  String get label {
    switch (kind) {
      case AttendanceStampKind.markIn:
        return 'IN';
      case AttendanceStampKind.markOut:
        return 'OUT';
      case AttendanceStampKind.reIn:
        return 'RE-IN';
      case AttendanceStampKind.autoOut:
        return 'AUTO-OUT';
    }
  }
}

enum ClassSessionStatus { scheduled, inProgress, completed, cancelled }

enum GeoFenceStatus { checking, inside, outside, unavailable }

enum AttendanceStampKind { markIn, markOut, reIn, autoOut }
