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

class DemoTeacherData {
  static String get teacherName => 'Aarati Shrestha';
  static String get branchName => 'Baneshwor Branch';

  static List<TeacherClassSession> todayClasses() {
    final now = DateTime.now();
    return [
      TeacherClassSession(
        id: 'math-10a',
        subject: 'Grade 10 Mathematics',
        room: 'Room 204',
        branch: branchName,
        enrolledCount: 28,
        status: ClassSessionStatus.completed,
        scheduledStart: DateTime(now.year, now.month, now.day, 8, 0),
        scheduledEnd: DateTime(now.year, now.month, now.day, 9, 0),
      ),
      TeacherClassSession(
        id: 'sci-9b',
        subject: 'Grade 9 Science',
        room: 'Room 102',
        branch: branchName,
        enrolledCount: 24,
        status: ClassSessionStatus.inProgress,
        scheduledStart: DateTime(now.year, now.month, now.day, 10, 0),
        scheduledEnd: DateTime(now.year, now.month, now.day, 11, 15),
      ),
      TeacherClassSession(
        id: 'eng-8c',
        subject: 'Grade 8 English',
        room: 'Room 109',
        branch: branchName,
        enrolledCount: 30,
        status: ClassSessionStatus.scheduled,
        scheduledStart: DateTime(now.year, now.month, now.day, 12, 30),
        scheduledEnd: DateTime(now.year, now.month, now.day, 13, 30),
      ),
      TeacherClassSession(
        id: 'extra-club',
        subject: 'Debate Club',
        room: 'Hall A',
        branch: branchName,
        enrolledCount: 16,
        status: ClassSessionStatus.cancelled,
        scheduledStart: DateTime(now.year, now.month, now.day, 15, 0),
        scheduledEnd: DateTime(now.year, now.month, now.day, 16, 0),
      ),
    ];
  }

  static List<TeacherClassSession> weeklySchedule() {
    final now = DateTime.now();
    return [
      TeacherClassSession(
        id: 'monday-1',
        subject: 'Grade 10 Mathematics',
        room: 'Room 204',
        branch: branchName,
        enrolledCount: 28,
        status: ClassSessionStatus.scheduled,
        scheduledStart: DateTime(now.year, now.month, now.day, 8, 0),
        scheduledEnd: DateTime(now.year, now.month, now.day, 9, 0),
      ),
      TeacherClassSession(
        id: 'monday-2',
        subject: 'Grade 9 Science',
        room: 'Room 102',
        branch: branchName,
        enrolledCount: 24,
        status: ClassSessionStatus.scheduled,
        scheduledStart: DateTime(now.year, now.month, now.day, 10, 0),
        scheduledEnd: DateTime(now.year, now.month, now.day, 11, 15),
      ),
      TeacherClassSession(
        id: 'tuesday-1',
        subject: 'Grade 8 English',
        room: 'Room 109',
        branch: branchName,
        enrolledCount: 30,
        status: ClassSessionStatus.scheduled,
        scheduledStart: DateTime(now.year, now.month, now.day + 1, 12, 30),
        scheduledEnd: DateTime(now.year, now.month, now.day + 1, 13, 30),
      ),
      TeacherClassSession(
        id: 'wednesday-1',
        subject: 'Debate Club',
        room: 'Hall A',
        branch: branchName,
        enrolledCount: 16,
        status: ClassSessionStatus.scheduled,
        scheduledStart: DateTime(now.year, now.month, now.day + 2, 15, 0),
        scheduledEnd: DateTime(now.year, now.month, now.day + 2, 16, 0),
      ),
    ];
  }

  static List<UpdateLogItem> pendingLogs() {
    return const [
      UpdateLogItem(id: 'log-1', className: 'Grade 10 Mathematics'),
      UpdateLogItem(id: 'log-2', className: 'Grade 9 Science'),
      UpdateLogItem(id: 'log-3', className: 'Debate Club'),
    ];
  }
}
