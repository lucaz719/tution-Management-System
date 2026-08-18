enum StudentCourseType { regular, music, shortTerm, longTerm, personalized }

extension StudentCourseTypeLabel on StudentCourseType {
  String get label => switch (this) {
        StudentCourseType.regular => 'Regular',
        StudentCourseType.music => 'Music',
        StudentCourseType.shortTerm => 'Short-term',
        StudentCourseType.longTerm => 'Long-term',
        StudentCourseType.personalized => 'Personalized',
      };
}

enum StudentAttendanceMark { present, absent, excused }

enum FeeDeadlineState { upcoming, dueSoon, overdue, paid }

enum AcademicEventType { holiday, exam, ceremony, feeDue }

class StudentSession {
  const StudentSession({
    required this.id,
    required this.subject,
    required this.teacher,
    required this.room,
    required this.startsAt,
    required this.endsAt,
    required this.type,
  });

  final String id;
  final String subject;
  final String teacher;
  final String room;
  final DateTime startsAt;
  final DateTime endsAt;
  final StudentCourseType type;
}

class StudentHomework {
  const StudentHomework({
    required this.id,
    required this.subject,
    required this.title,
    required this.dueAt,
    required this.teacher,
    this.isComplete = false,
  });

  final String id;
  final String subject;
  final String title;
  final DateTime dueAt;
  final String teacher;
  final bool isComplete;
}

class TestResult {
  const TestResult({
    required this.id,
    required this.subject,
    required this.testName,
    required this.score,
    required this.maximum,
    required this.classAverage,
    required this.publishedAt,
  });

  final String id;
  final String subject;
  final String testName;
  final double score;
  final double maximum;
  final double classAverage;
  final DateTime publishedAt;

  double get percentage => maximum == 0 ? 0 : (score / maximum) * 100;
}

class SubjectInsight {
  const SubjectInsight({
    required this.subject,
    required this.average,
    required this.previousAverage,
  });

  final String subject;
  final double average;
  final double previousAverage;

  double get change => average - previousAverage;
  String get trend => change > 2
      ? 'Improving'
      : change < -2
          ? 'Declining'
          : 'Stable';
}

class StudentAttendanceRecord {
  const StudentAttendanceRecord({
    required this.id,
    required this.subject,
    required this.sessionAt,
    required this.mark,
  });

  final String id;
  final String subject;
  final DateTime sessionAt;
  final StudentAttendanceMark mark;
}

class StudentInvoiceLine {
  const StudentInvoiceLine(this.label, this.amount);
  final String label;
  final double amount;
}

class StudentInvoice {
  const StudentInvoice({
    required this.id,
    required this.cycle,
    required this.dueDate,
    required this.state,
    required this.lines,
    this.qrReference,
  });

  final String id;
  final String cycle;
  final DateTime dueDate;
  final FeeDeadlineState state;
  final List<StudentInvoiceLine> lines;
  final String? qrReference;

  double get netPayable => lines.fold(0, (total, line) => total + line.amount);
}

class StudentCertificate {
  const StudentCertificate({
    required this.id,
    required this.title,
    required this.course,
    required this.issuedAt,
    required this.fileName,
  });

  final String id;
  final String title;
  final String course;
  final DateTime issuedAt;
  final String fileName;
}

class StudentAcademicEvent {
  const StudentAcademicEvent({
    required this.id,
    required this.title,
    required this.date,
    required this.type,
    required this.details,
  });

  final String id;
  final String title;
  final DateTime date;
  final AcademicEventType type;
  final String details;
}

class StudentNotice {
  const StudentNotice({
    required this.id,
    required this.title,
    required this.message,
    required this.createdAt,
    required this.route,
    this.isRead = false,
  });

  final String id;
  final String title;
  final String message;
  final DateTime createdAt;
  final String route;
  final bool isRead;
}
