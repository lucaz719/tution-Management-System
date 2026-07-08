import '../models/app_models.dart';

class MockPortalData {
  MockPortalData._();

  static final DateTime _now = DateTime.now();

  static final StudentProfile _aaravProfile = StudentProfile(
    id: 'child-aarav',
    name: 'Aarav Shrestha',
    grade: 'Grade 8',
    branch: 'Baneshwor',
    rollNo: '12',
    enrollmentId: 'TMS-2026-0812',
    academicYear: '2026/27',
    validityDate: DateTime(2027, 3, 31),
  );

  static final StudentProfile _saanviProfile = StudentProfile(
    id: 'child-saanvi',
    name: 'Saanvi Karki',
    grade: 'Grade 5',
    branch: 'Baneshwor',
    rollNo: '07',
    enrollmentId: 'TMS-2026-0507',
    academicYear: '2026/27',
    validityDate: DateTime(2027, 3, 31),
  );

  static final List<Announcement> branchAnnouncements = <Announcement>[
    Announcement(
      title: 'Unit test preparation class starts at 3:30 PM from Wednesday.',
      branch: 'Baneshwor',
      publishedAt: _now.subtract(const Duration(hours: 5)),
    ),
    Announcement(
      title: 'Parents meeting moved to Friday due to heavy rain alert.',
      branch: 'Baneshwor',
      publishedAt: _now.subtract(const Duration(hours: 20)),
    ),
    Announcement(
      title: 'Library corner remains open until 5:30 PM this week.',
      branch: 'Baneshwor',
      publishedAt: _now.subtract(const Duration(days: 2)),
    ),
  ];

  static final List<Invoice> _studentInvoices = <Invoice>[
    Invoice(
      monthLabel: 'June 2026',
      amount: 4500,
      dueDate: DateTime(2026, 6, 1),
      status: InvoiceStatus.paid,
      breakdown: const <InvoiceBreakdownItem>[
        InvoiceBreakdownItem(label: 'Tuition fee', amount: 3800),
        InvoiceBreakdownItem(label: 'Lab access', amount: 400),
        InvoiceBreakdownItem(label: 'Transport support', amount: 300),
      ],
    ),
    Invoice(
      monthLabel: 'July 2026',
      amount: 4500,
      dueDate: DateTime(2026, 7, 1),
      status: InvoiceStatus.paid,
      breakdown: const <InvoiceBreakdownItem>[
        InvoiceBreakdownItem(label: 'Tuition fee', amount: 3800),
        InvoiceBreakdownItem(label: 'Lab access', amount: 400),
        InvoiceBreakdownItem(label: 'Transport support', amount: 300),
      ],
    ),
    Invoice(
      monthLabel: 'August 2026',
      amount: 4500,
      dueDate: DateTime(2026, 8, 1),
      status: InvoiceStatus.due,
      breakdown: const <InvoiceBreakdownItem>[
        InvoiceBreakdownItem(label: 'Tuition fee', amount: 3800),
        InvoiceBreakdownItem(label: 'Lab access', amount: 400),
        InvoiceBreakdownItem(label: 'Transport support', amount: 300),
      ],
    ),
  ];

  static final StudentPortalData student = StudentPortalData(
    profile: _aaravProfile,
    todaysSchedule: const <ScheduleEntry>[
      ScheduleEntry(
        time: '07:00 AM',
        subject: 'Mathematics',
        teacher: 'Ms. Riya Gurung',
        room: 'Room 2A',
        status: ScheduleAttendanceStatus.present,
      ),
      ScheduleEntry(
        time: '08:10 AM',
        subject: 'English',
        teacher: 'Mr. Suman Bista',
        room: 'Room 2A',
        status: ScheduleAttendanceStatus.present,
      ),
      ScheduleEntry(
        time: '09:20 AM',
        subject: 'Science Lab',
        teacher: 'Ms. Nima Sherpa',
        room: 'Lab 1',
        status: ScheduleAttendanceStatus.absent,
      ),
      ScheduleEntry(
        time: '10:30 AM',
        subject: 'Computer',
        teacher: 'Mr. Roshan KC',
        room: 'ICT 3',
        status: ScheduleAttendanceStatus.upcoming,
      ),
    ],
    weeklySchedule: const <TimetableDay>[
      TimetableDay(
        dayLabel: 'Sunday',
        classes: <ScheduleEntry>[
          ScheduleEntry(
            time: '07:00 AM',
            subject: 'Mathematics',
            teacher: 'Ms. Riya Gurung',
            room: 'Room 2A',
            status: ScheduleAttendanceStatus.upcoming,
          ),
          ScheduleEntry(
            time: '08:10 AM',
            subject: 'English',
            teacher: 'Mr. Suman Bista',
            room: 'Room 2A',
            status: ScheduleAttendanceStatus.upcoming,
          ),
        ],
      ),
      TimetableDay(
        dayLabel: 'Monday',
        classes: <ScheduleEntry>[
          ScheduleEntry(
            time: '07:00 AM',
            subject: 'Science',
            teacher: 'Ms. Nima Sherpa',
            room: 'Lab 1',
            status: ScheduleAttendanceStatus.upcoming,
          ),
          ScheduleEntry(
            time: '08:10 AM',
            subject: 'Nepali',
            teacher: 'Mr. Dipesh Adhikari',
            room: 'Room 2A',
            status: ScheduleAttendanceStatus.upcoming,
          ),
          ScheduleEntry(
            time: '09:20 AM',
            subject: 'Computer',
            teacher: 'Mr. Roshan KC',
            room: 'ICT 3',
            status: ScheduleAttendanceStatus.upcoming,
          ),
        ],
      ),
      TimetableDay(
        dayLabel: 'Tuesday',
        classes: <ScheduleEntry>[
          ScheduleEntry(
            time: '07:00 AM',
            subject: 'Social Studies',
            teacher: 'Ms. Sushmita Rai',
            room: 'Room 2B',
            status: ScheduleAttendanceStatus.upcoming,
          ),
          ScheduleEntry(
            time: '08:10 AM',
            subject: 'Mathematics',
            teacher: 'Ms. Riya Gurung',
            room: 'Room 2A',
            status: ScheduleAttendanceStatus.upcoming,
          ),
        ],
      ),
      TimetableDay(
        dayLabel: 'Wednesday',
        classes: <ScheduleEntry>[
          ScheduleEntry(
            time: '07:00 AM',
            subject: 'English',
            teacher: 'Mr. Suman Bista',
            room: 'Room 2A',
            status: ScheduleAttendanceStatus.upcoming,
          ),
          ScheduleEntry(
            time: '08:10 AM',
            subject: 'Computer',
            teacher: 'Mr. Roshan KC',
            room: 'ICT 3',
            status: ScheduleAttendanceStatus.upcoming,
          ),
        ],
      ),
      TimetableDay(
        dayLabel: 'Thursday',
        classes: <ScheduleEntry>[
          ScheduleEntry(
            time: '07:00 AM',
            subject: 'Science Lab',
            teacher: 'Ms. Nima Sherpa',
            room: 'Lab 1',
            status: ScheduleAttendanceStatus.upcoming,
          ),
          ScheduleEntry(
            time: '08:10 AM',
            subject: 'Mathematics',
            teacher: 'Ms. Riya Gurung',
            room: 'Room 2A',
            status: ScheduleAttendanceStatus.upcoming,
          ),
        ],
      ),
      TimetableDay(
        dayLabel: 'Friday',
        classes: <ScheduleEntry>[
          ScheduleEntry(
            time: '07:00 AM',
            subject: 'Project Hour',
            teacher: 'Ms. Sushmita Rai',
            room: 'Room 2B',
            status: ScheduleAttendanceStatus.upcoming,
          ),
        ],
      ),
    ],
    invoices: _studentInvoices,
    announcements: branchAnnouncements,
  );

  static final List<ParentChildPortalData> parentChildren =
      <ParentChildPortalData>[
    ParentChildPortalData(
      child: _aaravProfile,
      todayAttendance: AttendanceStatus.present,
      lastUpdated: DateTime(2026, 7, 7, 10, 12),
      outstandingBalance: 4500,
      dueDate: DateTime(2026, 8, 1),
      remainingClasses: const <ScheduleEntry>[
        ScheduleEntry(
          time: '10:30 AM',
          subject: 'Computer',
          teacher: 'Mr. Roshan KC',
          room: 'ICT 3',
          status: ScheduleAttendanceStatus.upcoming,
        ),
        ScheduleEntry(
          time: '11:40 AM',
          subject: 'Art & Design',
          teacher: 'Ms. Muna Thapa',
          room: 'Studio',
          status: ScheduleAttendanceStatus.upcoming,
        ),
      ],
      invoices: _studentInvoices,
      announcements: branchAnnouncements,
      monthlyAttendance: <MonthlyAttendanceSummary>[
        _buildMonthlySummary(
          month: DateTime(2026, 7),
          absentDays: <int>[3],
          excusedDays: <int>[11],
        ),
        _buildMonthlySummary(
          month: DateTime(2026, 6),
          absentDays: <int>[6, 18],
          excusedDays: <int>[14],
        ),
      ],
    ),
    ParentChildPortalData(
      child: _saanviProfile,
      todayAttendance: AttendanceStatus.excused,
      lastUpdated: DateTime(2026, 7, 7, 9, 45),
      outstandingBalance: 0,
      dueDate: DateTime(2026, 8, 1),
      remainingClasses: const <ScheduleEntry>[
        ScheduleEntry(
          time: '10:00 AM',
          subject: 'Reading Circle',
          teacher: 'Ms. Sabina KC',
          room: 'Room 1B',
          status: ScheduleAttendanceStatus.upcoming,
        ),
      ],
      invoices: <Invoice>[
        Invoice(
          monthLabel: 'June 2026',
          amount: 3900,
          dueDate: DateTime(2026, 6, 1),
          status: InvoiceStatus.paid,
          breakdown: const <InvoiceBreakdownItem>[
            InvoiceBreakdownItem(label: 'Tuition fee', amount: 3300),
            InvoiceBreakdownItem(label: 'Activity kit', amount: 600),
          ],
        ),
        Invoice(
          monthLabel: 'July 2026',
          amount: 3900,
          dueDate: DateTime(2026, 7, 1),
          status: InvoiceStatus.paid,
          breakdown: const <InvoiceBreakdownItem>[
            InvoiceBreakdownItem(label: 'Tuition fee', amount: 3300),
            InvoiceBreakdownItem(label: 'Activity kit', amount: 600),
          ],
        ),
        Invoice(
          monthLabel: 'August 2026',
          amount: 3900,
          dueDate: DateTime(2026, 8, 1),
          status: InvoiceStatus.paid,
          breakdown: const <InvoiceBreakdownItem>[
            InvoiceBreakdownItem(label: 'Tuition fee', amount: 3300),
            InvoiceBreakdownItem(label: 'Activity kit', amount: 600),
          ],
        ),
      ],
      announcements: branchAnnouncements,
      monthlyAttendance: <MonthlyAttendanceSummary>[
        _buildMonthlySummary(
          month: DateTime(2026, 7),
          absentDays: <int>[2, 9],
          excusedDays: <int>[7],
        ),
        _buildMonthlySummary(
          month: DateTime(2026, 6),
          absentDays: <int>[5],
          excusedDays: <int>[13, 20],
        ),
      ],
    ),
  ];

  static MonthlyAttendanceSummary _buildMonthlySummary({
    required DateTime month,
    required List<int> absentDays,
    List<int> excusedDays = const <int>[],
  }) {
    const List<String> subjectRotation = <String>[
      'Mathematics',
      'Science',
      'English',
      'Computer',
      'Social Studies',
    ];

    final List<AttendanceRecord> records = <AttendanceRecord>[];
    final int lastDay = DateTime(month.year, month.month + 1, 0).day;
    var subjectIndex = 0;

    for (var day = 1; day <= lastDay; day++) {
      final DateTime date = DateTime(month.year, month.month, day);
      if (date.weekday == DateTime.saturday) {
        continue;
      }

      final AttendanceStatus status = absentDays.contains(day)
          ? AttendanceStatus.absent
          : excusedDays.contains(day)
              ? AttendanceStatus.excused
              : AttendanceStatus.present;

      records.add(
        AttendanceRecord(
          date: date,
          subject: subjectRotation[subjectIndex % subjectRotation.length],
          status: status,
        ),
      );
      subjectIndex++;
    }

    return MonthlyAttendanceSummary(month: month, records: records);
  }
}
