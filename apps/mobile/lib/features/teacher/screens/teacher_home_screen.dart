import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:tms_mobile/core/theme/app_colors.dart';
import 'package:tms_mobile/core/utils/formatters.dart';
import 'package:tms_mobile/features/teacher/models/teacher_models.dart';
import 'package:tms_mobile/features/teacher/screens/geo_attendance_screen.dart';

class TeacherHomeScreen extends StatefulWidget {
  const TeacherHomeScreen({super.key});

  @override
  State<TeacherHomeScreen> createState() => _TeacherHomeScreenState();
}

class _TeacherHomeScreenState extends State<TeacherHomeScreen> {
  late final List<TeacherClassSession> _todayClasses;
  late final List<TeacherClassSession> _weeklySchedule;
  late final List<UpdateLogItem> _pendingLogs;
  final Set<String> _submittedLogIds = <String>{'log-1'};
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _todayClasses = DemoTeacherData.todayClasses();
    _weeklySchedule = DemoTeacherData.weeklySchedule();
    _pendingLogs = DemoTeacherData.pendingLogs();
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      _TodayTab(
        todayClasses: _todayClasses,
        pendingLogs: _pendingLogs,
        submittedLogIds: _submittedLogIds,
        onSubmitLog: (id) => setState(() => _submittedLogIds.add(id)),
      ),
      _TimetableTab(sessions: _weeklySchedule),
      _AttendanceTab(
        sessions: _todayClasses,
        onMarkAttendance: (session) {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => GeoAttendanceScreen(session: session),
            ),
          );
        },
      ),
      const _ProfileTab(),
    ];

    return Scaffold(
      body: SafeArea(child: pages[_currentIndex]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (value) => setState(() => _currentIndex = value),
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: 'Today'),
          NavigationDestination(
              icon: Icon(Icons.calendar_month_outlined),
              selectedIcon: Icon(Icons.calendar_month),
              label: 'Timetable'),
          NavigationDestination(
              icon: Icon(Icons.check_circle_outline),
              selectedIcon: Icon(Icons.check_circle),
              label: 'Attendance'),
          NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Profile'),
        ],
      ),
    );
  }
}

class _TodayTab extends StatelessWidget {
  const _TodayTab({
    required this.todayClasses,
    required this.pendingLogs,
    required this.submittedLogIds,
    required this.onSubmitLog,
  });

  final List<TeacherClassSession> todayClasses;
  final List<UpdateLogItem> pendingLogs;
  final Set<String> submittedLogIds;
  final ValueChanged<String> onSubmitLog;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'Good morning, ${DemoTeacherData.teacherName}',
          style: GoogleFonts.fraunces(
              fontSize: 28, fontWeight: FontWeight.w700, color: kColorText),
        ),
        const SizedBox(height: 16),
        _SectionCard(
          title: 'My Classes Today',
          child: Column(
            children: todayClasses
                .map(
                  (session) => Padding(
                    padding: const EdgeInsets.only(bottom: 14),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: kColorPrimary.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            formatShortTime(session.scheduledStart),
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(
                                  color: kColorPrimary,
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(session.subject,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700)),
                              const SizedBox(height: 4),
                              Text(
                                  '${session.room} • ${session.enrolledCount} enrolled'),
                            ],
                          ),
                        ),
                        _StatusBadge(status: session.status),
                      ],
                    ),
                  ),
                )
                .toList(),
          ),
        ),
        const SizedBox(height: 16),
        _SectionCard(
          title: 'Pending Update Logs',
          child: Column(
            children: pendingLogs
                .map(
                  (log) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      children: [
                        Expanded(child: Text(log.className)),
                        if (submittedLogIds.contains(log.id))
                          Row(
                            children: const [
                              Icon(Icons.check_circle,
                                  color: kColorSuccess, size: 18),
                              SizedBox(width: 6),
                              Text('Submitted'),
                            ],
                          )
                        else
                          FilledButton.tonal(
                            onPressed: () => onSubmitLog(log.id),
                            style: FilledButton.styleFrom(
                                minimumSize: const Size(96, 48)),
                            child: const Text('Submit'),
                          ),
                      ],
                    ),
                  ),
                )
                .toList(),
          ),
        ),
        const SizedBox(height: 16),
        _HomeworkPreviewCard(classesCount: todayClasses.length),
      ],
    );
  }
}

class _TimetableTab extends StatelessWidget {
  const _TimetableTab({required this.sessions});

  final List<TeacherClassSession> sessions;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Weekly Timetable',
            style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 16),
        ...sessions.map(
          (session) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Card(
              child: ListTile(
                contentPadding: const EdgeInsets.all(16),
                title: Text(session.subject,
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text(
                  '${formatTimestamp(session.scheduledStart)} • ${session.room}',
                ),
                trailing: Text('${session.enrolledCount} students'),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _AttendanceTab extends StatelessWidget {
  const _AttendanceTab({
    required this.sessions,
    required this.onMarkAttendance,
  });

  final List<TeacherClassSession> sessions;
  final ValueChanged<TeacherClassSession> onMarkAttendance;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Attendance', style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 16),
        ...sessions.map(
          (session) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(session.subject,
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 6),
                    Text(
                        '${formatShortTime(session.scheduledStart)} • ${session.room}'),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => onMarkAttendance(session),
                        child: const Text('Mark Attendance'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Profile', style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                const CircleAvatar(
                    radius: 38, child: Icon(Icons.person, size: 38)),
                const SizedBox(height: 12),
                Text(DemoTeacherData.teacherName,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 18)),
                const SizedBox(height: 6),
                Text('${DemoTeacherData.branchName} • Senior Teacher'),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        _SectionCard(
          title: 'Leave Requests',
          child: Column(
            children: const [
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.event_note, color: kColorWarning),
                title: Text('Personal Leave — 12 Jul'),
                subtitle: Text('Awaiting Branch Admin approval'),
              ),
              Divider(),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.check_circle, color: kColorSuccess),
                title: Text('Medical Leave — 24 Jun'),
                subtitle: Text('Approved'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _HomeworkPreviewCard extends StatelessWidget {
  const _HomeworkPreviewCard({required this.classesCount});

  final int classesCount;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        _SectionCard(
          title: 'Homework Submissions',
          child: Column(
            children: List.generate(
              classesCount,
              (index) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  children: [
                    Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                            color: const Color(0xFFE8EDF4),
                            borderRadius: BorderRadius.circular(12))),
                    const SizedBox(width: 12),
                    Expanded(
                        child: Text('Class ${index + 1} pending submissions')),
                    const Text('24'),
                  ],
                ),
              ),
            ),
          ),
        ),
        Positioned.fill(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
              child: Container(color: Colors.white.withOpacity(0.35)),
            ),
          ),
        ),
        Positioned(
          top: 18,
          right: 18,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: kColorPrimary,
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Text(
              'Phase 2 — Coming Soon',
              style:
                  TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
            ),
          ),
        ),
      ],
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style:
                    const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
            const SizedBox(height: 14),
            child,
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final ClassSessionStatus status;

  @override
  Widget build(BuildContext context) {
    late final Color background;
    late final Color foreground;
    late final String label;

    switch (status) {
      case ClassSessionStatus.scheduled:
        background = kColorPrimary.withOpacity(0.12);
        foreground = kColorPrimary;
        label = 'Scheduled';
        break;
      case ClassSessionStatus.inProgress:
        background = kColorWarning.withOpacity(0.16);
        foreground = kColorWarning;
        label = 'In Progress';
        break;
      case ClassSessionStatus.completed:
        background = kColorSuccess.withOpacity(0.16);
        foreground = kColorSuccess;
        label = 'Completed';
        break;
      case ClassSessionStatus.cancelled:
        background = kColorError.withOpacity(0.16);
        foreground = kColorError;
        label = 'Cancelled';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
          color: background, borderRadius: BorderRadius.circular(999)),
      child: Text(label,
          style: TextStyle(color: foreground, fontWeight: FontWeight.w700)),
    );
  }
}
