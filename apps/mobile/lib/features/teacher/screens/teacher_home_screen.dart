import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:tms_mobile/core/adaptive/breakpoints.dart';
import 'package:tms_mobile/core/adaptive/capabilities.dart';
import 'package:tms_mobile/core/adaptive/widgets/adaptive_layout.dart';
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

  @override
  void initState() {
    super.initState();
    _todayClasses = DemoTeacherData.todayClasses();
    _weeklySchedule = DemoTeacherData.weeklySchedule();
    _pendingLogs = DemoTeacherData.pendingLogs();
  }

  @override
  Widget build(BuildContext context) {
    final sizeClass = Breakpoints.fromWidth(MediaQuery.sizeOf(context).width);
    final canShowSidebar = const ShowSidebar().isAvailableAt(sizeClass);

    return Scaffold(
      body: SafeArea(
        child: AdaptiveScaffold(
          selectedIndex: 0,
          onDestinationSelected: (index) {},
          destinations: const [
            AdaptiveNavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: 'Today',
            ),
            AdaptiveNavigationDestination(
              icon: Icon(Icons.calendar_month_outlined),
              selectedIcon: Icon(Icons.calendar_month),
              label: 'Timetable',
            ),
            AdaptiveNavigationDestination(
              icon: Icon(Icons.check_circle_outline),
              selectedIcon: Icon(Icons.check_circle),
              label: 'Attendance',
            ),
            AdaptiveNavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Profile',
            ),
          ],
          body: (context, index) {
            switch (index) {
              case 0:
                return _TodayTab(
                  todayClasses: _todayClasses,
                  pendingLogs: _pendingLogs,
                  submittedLogIds: _submittedLogIds,
                  onSubmitLog: (id) => setState(() => _submittedLogIds.add(id)),
                );
              case 1:
                return _TimetableTab(sessions: _weeklySchedule);
              case 2:
                return _AttendanceTab(
                  sessions: _todayClasses,
                  onMarkAttendance: (session) {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => GeoAttendanceScreen(session: session),
                      ),
                    );
                  },
                );
              case 3:
                return const _ProfileTab();
              default:
                return const SizedBox.shrink();
            }
          },
          sidebar: canShowSidebar ? _buildSidebar() : null,
        ),
      ),
    );
  }

  Widget _buildSidebar() {
    return Container(
      color: kColorSurface,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Quick Actions',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: kColorPrimary,
                ),
          ),
          const SizedBox(height: 16),
          _SidebarAction(
            icon: Icons.add_circle_outline,
            label: 'Create Homework',
            onTap: () {},
          ),
          _SidebarAction(
            icon: Icons.assignment_outlined,
            label: 'Grade Submissions',
            onTap: () {},
          ),
          _SidebarAction(
            icon: Icons.people_outline,
            label: 'Manage Students',
            onTap: () {},
          ),
          _SidebarAction(
            icon: Icons.settings_outlined,
            label: 'Class Settings',
            onTap: () {},
          ),
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 16),
          Text(
            'Today\'s Stats',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: kColorPrimary,
                ),
          ),
          const SizedBox(height: 16),
          _StatRow(
            label: 'Classes Today',
            value: '${DemoTeacherData.todayClasses().length}',
          ),
          _StatRow(
            label: 'Students',
            value: DemoTeacherData.todayClasses()
                .fold<int>(0, (sum, s) => sum + s.enrolledCount)
                .toString(),
          ),
          _StatRow(
            label: 'Pending Logs',
            value: '${DemoTeacherData.pendingLogs().length}',
          ),
        ],
      ),
    );
  }
}

class _SidebarAction extends StatelessWidget {
  const _SidebarAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: kColorPrimary),
      title: Text(label),
      onTap: onTap,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      hoverColor: kColorPrimary.withValues(alpha: 0.08),
    );
  }
}

class _StatRow extends StatelessWidget {
  const _StatRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: kColorPrimary,
                ),
          ),
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
    return ResponsiveBuilder(
      builder: (context, sizeClass) {
        final useTwoColumns = const UseTwoColumns().isAvailableAt(sizeClass);

        if (useTwoColumns) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 2,
                child: _buildClassesColumn(context),
              ),
              const SizedBox(width: 16),
              Expanded(
                flex: 1,
                child: Column(
                  children: [
                    _buildPendingLogs(context),
                    const SizedBox(height: 16),
                    _HomeworkPreviewCard(classesCount: todayClasses.length),
                  ],
                ),
              ),
            ],
          );
        }

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildClassesColumn(context),
            const SizedBox(height: 16),
            _buildPendingLogs(context),
            const SizedBox(height: 16),
            _HomeworkPreviewCard(classesCount: todayClasses.length),
          ],
        );
      },
    );
  }

  Widget _buildClassesColumn(BuildContext context) {
    return _SectionCard(
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
                        color: kColorPrimary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        formatShortTime(session.scheduledStart),
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
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
                              style:
                                  const TextStyle(fontWeight: FontWeight.w700)),
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
    );
  }

  Widget _buildPendingLogs(BuildContext context) {
    return _SectionCard(
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
                      const Row(
                        children: [
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
    );
  }
}

class _TimetableTab extends StatelessWidget {
  const _TimetableTab({required this.sessions});

  final List<TeacherClassSession> sessions;

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, sizeClass) {
        final useDataTable = const UseDataTable().isAvailableAt(sizeClass);

        if (useDataTable) {
          return _buildTableView(context);
        }

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
      },
    );
  }

  Widget _buildTableView(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: DataTable(
        columns: const [
          DataColumn(label: Text('Subject')),
          DataColumn(label: Text('Time')),
          DataColumn(label: Text('Room')),
          DataColumn(label: Text('Students')),
          DataColumn(label: Text('Status')),
        ],
        rows: sessions.map((session) {
          return DataRow(
            cells: [
              DataCell(Text(session.subject,
                  style: const TextStyle(fontWeight: FontWeight.w700))),
              DataCell(Text(formatTimestamp(session.scheduledStart))),
              DataCell(Text(session.room)),
              DataCell(Text('${session.enrolledCount}')),
              DataCell(_StatusBadge(status: session.status)),
            ],
          );
        }).toList(),
      ),
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
    return ResponsiveBuilder(
      builder: (context, sizeClass) {
        if (const UseTwoColumns().isAvailableAt(sizeClass)) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 1,
                child: _buildProfileCard(context),
              ),
              const SizedBox(width: 16),
              Expanded(
                flex: 1,
                child: _buildLeaveRequests(context),
              ),
            ],
          );
        }

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildProfileCard(context),
            const SizedBox(height: 16),
            _buildLeaveRequests(context),
          ],
        );
      },
    );
  }

  Widget _buildProfileCard(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            const CircleAvatar(radius: 38, child: Icon(Icons.person, size: 38)),
            const SizedBox(height: 12),
            Text(DemoTeacherData.teacherName,
                style:
                    const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
            const SizedBox(height: 6),
            Text('${DemoTeacherData.branchName} • Senior Teacher'),
          ],
        ),
      ),
    );
  }

  Widget _buildLeaveRequests(BuildContext context) {
    return const _SectionCard(
      title: 'Leave Requests',
      child: Column(
        children: [
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
              child: Container(color: Colors.white.withValues(alpha: 0.35)),
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
        background = kColorPrimary.withValues(alpha: 0.12);
        foreground = kColorPrimary;
        label = 'Scheduled';
        break;
      case ClassSessionStatus.inProgress:
        background = kColorWarning.withValues(alpha: 0.16);
        foreground = kColorWarning;
        label = 'In Progress';
        break;
      case ClassSessionStatus.completed:
        background = kColorSuccess.withValues(alpha: 0.16);
        foreground = kColorSuccess;
        label = 'Completed';
        break;
      case ClassSessionStatus.cancelled:
        background = kColorError.withValues(alpha: 0.16);
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
