import '../models/student_portal_models.dart';

abstract final class StudentDemoData {
  static final now = DateTime.now();

  static final sessions = <StudentSession>[
    StudentSession(
      id: 'session-math',
      subject: 'Mathematics',
      teacher: 'Ms. Riya Gurung',
      room: 'Room 2A',
      startsAt: DateTime(now.year, now.month, now.day, 7),
      endsAt: DateTime(now.year, now.month, now.day, 8),
      type: StudentCourseType.regular,
    ),
    StudentSession(
      id: 'session-guitar',
      subject: 'Guitar Fundamentals',
      teacher: 'Mr. Aayush Rai',
      room: 'Music Studio',
      startsAt: DateTime(now.year, now.month, now.day, 9, 15),
      endsAt: DateTime(now.year, now.month, now.day, 10, 15),
      type: StudentCourseType.music,
    ),
    StudentSession(
      id: 'session-science',
      subject: 'Science Revision',
      teacher: 'Ms. Nima Sherpa',
      room: 'Lab 1',
      startsAt: DateTime(now.year, now.month, now.day, 15, 30),
      endsAt: DateTime(now.year, now.month, now.day, 16, 30),
      type: StudentCourseType.personalized,
    ),
  ];

  static final homework = <StudentHomework>[
    StudentHomework(
      id: 'homework-1',
      subject: 'Mathematics',
      title: 'Complete algebra worksheet 4',
      dueAt: now.add(const Duration(days: 1, hours: 4)),
      teacher: 'Ms. Riya Gurung',
    ),
    StudentHomework(
      id: 'homework-2',
      subject: 'English',
      title: 'Prepare a two-minute book reflection',
      dueAt: now.add(const Duration(days: 3)),
      teacher: 'Mr. Suman Bista',
    ),
    StudentHomework(
      id: 'homework-3',
      subject: 'Science',
      title: 'Label the digestive system diagram',
      dueAt: now.subtract(const Duration(days: 1)),
      teacher: 'Ms. Nima Sherpa',
    ),
  ];

  static final results = <TestResult>[
    TestResult(
      id: 'result-1',
      subject: 'Mathematics',
      testName: 'Algebra Unit Test',
      score: 44,
      maximum: 50,
      classAverage: 36,
      publishedAt: now.subtract(const Duration(hours: 3)),
    ),
    TestResult(
      id: 'result-2',
      subject: 'Science',
      testName: 'Biology Quiz',
      score: 31,
      maximum: 50,
      classAverage: 34,
      publishedAt: now.subtract(const Duration(days: 4)),
    ),
    TestResult(
      id: 'result-3',
      subject: 'English',
      testName: 'Grammar Assessment',
      score: 39,
      maximum: 50,
      classAverage: 35,
      publishedAt: now.subtract(const Duration(days: 8)),
    ),
  ];

  static const insights = <SubjectInsight>[
    SubjectInsight(subject: 'Mathematics', average: 86, previousAverage: 78),
    SubjectInsight(subject: 'English', average: 78, previousAverage: 76),
    SubjectInsight(subject: 'Science', average: 62, previousAverage: 70),
  ];

  static final attendance = <StudentAttendanceRecord>[
    StudentAttendanceRecord(
      id: 'attendance-1',
      subject: 'Mathematics',
      sessionAt: now.subtract(const Duration(days: 1)),
      mark: StudentAttendanceMark.present,
    ),
    StudentAttendanceRecord(
      id: 'attendance-2',
      subject: 'Science',
      sessionAt: now.subtract(const Duration(days: 2)),
      mark: StudentAttendanceMark.excused,
    ),
    StudentAttendanceRecord(
      id: 'attendance-3',
      subject: 'English',
      sessionAt: now.subtract(const Duration(days: 3)),
      mark: StudentAttendanceMark.absent,
    ),
    StudentAttendanceRecord(
      id: 'attendance-4',
      subject: 'Computer',
      sessionAt: now.subtract(const Duration(days: 4)),
      mark: StudentAttendanceMark.present,
    ),
  ];

  static final invoices = <StudentInvoice>[
    StudentInvoice(
      id: 'invoice-aug',
      cycle: 'August 2026',
      dueDate: DateTime(2026, 8, 1),
      state: FeeDeadlineState.overdue,
      qrReference: 'TMS-AUG-2026-0812',
      lines: const [
        StudentInvoiceLine('Tuition dues', 3800),
        StudentInvoiceLine('Music course', 900),
        StudentInvoiceLine('Merit discount', -300),
        StudentInvoiceLine('Late fine', 100),
      ],
    ),
    StudentInvoice(
      id: 'invoice-sep',
      cycle: 'September 2026',
      dueDate: DateTime(2026, 9, 1),
      state: FeeDeadlineState.upcoming,
      lines: const [
        StudentInvoiceLine('Tuition dues', 3800),
        StudentInvoiceLine('Music course', 900),
        StudentInvoiceLine('Merit discount', -300),
      ],
    ),
    StudentInvoice(
      id: 'invoice-jul',
      cycle: 'July 2026',
      dueDate: DateTime(2026, 7, 1),
      state: FeeDeadlineState.paid,
      lines: const [StudentInvoiceLine('Tuition dues', 3800)],
    ),
  ];

  static final certificates = <StudentCertificate>[
    StudentCertificate(
      id: 'CERT-2026-0192',
      title: 'Course Completion Certificate',
      course: 'Foundation Guitar',
      issuedAt: DateTime(2026, 7, 24),
      fileName: 'foundation-guitar-certificate.pdf',
    ),
    StudentCertificate(
      id: 'CERT-2026-0101',
      title: 'Academic Excellence',
      course: 'Grade 7 Mathematics',
      issuedAt: DateTime(2026, 4, 12),
      fileName: 'academic-excellence-2026.pdf',
    ),
  ];

  static final events = <StudentAcademicEvent>[
    StudentAcademicEvent(
      id: 'event-1',
      title: 'First Term Examination',
      date: now.add(const Duration(days: 5)),
      type: AcademicEventType.exam,
      details: 'Examinations begin at 8:00 AM. Bring your student ID.',
    ),
    StudentAcademicEvent(
      id: 'event-2',
      title: 'Fee payment deadline',
      date: now.add(const Duration(days: 8)),
      type: AcademicEventType.feeDue,
      details: 'September billing cycle payment deadline.',
    ),
    StudentAcademicEvent(
      id: 'event-3',
      title: 'Gaijatra holiday',
      date: now.add(const Duration(days: 12)),
      type: AcademicEventType.holiday,
      details: 'All branches remain closed.',
    ),
    StudentAcademicEvent(
      id: 'event-4',
      title: 'Student achievement ceremony',
      date: now.add(const Duration(days: 18)),
      type: AcademicEventType.ceremony,
      details: 'Main auditorium, Baneshwor branch.',
    ),
  ];

  static final notices = <StudentNotice>[
    StudentNotice(
      id: 'notice-1',
      title: 'Fee overdue',
      message: 'NPR 4,500 was due on 1 Aug 2026.',
      createdAt: now.subtract(const Duration(hours: 1)),
      route: '/student/fees',
    ),
    StudentNotice(
      id: 'notice-2',
      title: 'New homework',
      message: 'Mathematics homework is due tomorrow.',
      createdAt: now.subtract(const Duration(hours: 5)),
      route: '/student/academics',
    ),
    StudentNotice(
      id: 'notice-3',
      title: 'Certificate issued',
      message: 'Your Foundation Guitar certificate is ready.',
      createdAt: now.subtract(const Duration(days: 2)),
      route: '/student/certificates',
      isRead: true,
    ),
    StudentNotice(
      id: 'notice-4',
      title: 'Leave approved',
      message: 'Your leave for Science on 27 Jul was approved.',
      createdAt: now.subtract(const Duration(days: 3)),
      route: '/student/attendance',
      isRead: true,
    ),
  ];
}

