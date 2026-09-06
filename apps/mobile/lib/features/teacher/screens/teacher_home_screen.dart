import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tms_mobile/core/adaptive/breakpoints.dart';
import 'package:tms_mobile/core/adaptive/capabilities.dart';
import 'package:tms_mobile/core/adaptive/widgets/adaptive_layout.dart';
import 'package:tms_mobile/core/providers/auth_provider.dart';
import 'package:tms_mobile/core/theme/app_colors.dart';
import 'package:tms_mobile/core/utils/formatters.dart';
import 'package:tms_mobile/features/teacher/models/teacher_models.dart';
import 'package:tms_mobile/features/teacher/screens/geo_attendance_screen.dart';
import 'package:tms_mobile/features/teacher/screens/teacher_leave_screen.dart';

class TeacherHomeScreen extends ConsumerStatefulWidget {
  const TeacherHomeScreen({super.key});

  @override
  ConsumerState<TeacherHomeScreen> createState() => _TeacherHomeScreenState();
}

class _TeacherHomeScreenState extends ConsumerState<TeacherHomeScreen> {
  int _selectedIndex = 0;
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

  void _onDestinationSelected(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  void _openGeoAttendance(TeacherClassSession session) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => GeoAttendanceScreen(session: session),
      ),
    );
  }

  void _openLeaveScreen() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const TeacherLeaveScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final sizeClass = Breakpoints.fromWidth(MediaQuery.sizeOf(context).width);
    final canShowSidebar = const ShowSidebar().isAvailableAt(sizeClass);
    final user = ref.watch(authProvider).user;

    return AdaptiveScaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Teacher Portal',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            Text(
              'Welcome, ${user?.name ?? DemoTeacherData.teacherName}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: kColorText.withValues(alpha: 0.7),
                  ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Leave Requests',
            icon: const Icon(Icons.event_busy_outlined),
            onPressed: _openLeaveScreen,
          ),
          IconButton(
            tooltip: 'Log Out',
            icon: const Icon(Icons.logout_rounded),
            onPressed: () => ref.read(authProvider.notifier).logout(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      selectedIndex: _selectedIndex,
      onDestinationSelected: _onDestinationSelected,
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
              onClassTap: _openGeoAttendance,
              onApplyLeave: _openLeaveScreen,
              onViewTimetable: () => _onDestinationSelected(1),
              onSubmitLog: (id) {
                setState(() => _submittedLogIds.add(id));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                      content: Text('Update log submitted successfully!')),
                );
              },
            );
          case 1:
            return _TimetableTab(
              sessions: _weeklySchedule,
              onSessionTap: _openGeoAttendance,
            );
          case 2:
            return _AttendanceTab(
              sessions: _todayClasses,
              onMarkAttendance: _openGeoAttendance,
            );
          case 3:
            return _ProfileTab(
              onApplyLeave: _openLeaveScreen,
              onLogout: () => ref.read(authProvider.notifier).logout(),
            );
          default:
            return const SizedBox.shrink();
        }
      },
      sidebar: canShowSidebar ? _buildSidebar() : null,
    );
  }

  Widget _buildSidebar() {
    return Container(
      width: 260,
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
            icon: Icons.event_note_outlined,
            label: 'Apply for Leave',
            onTap: _openLeaveScreen,
          ),
          _SidebarAction(
            icon: Icons.calendar_month_outlined,
            label: 'Full Timetable',
            onTap: () => _onDestinationSelected(1),
          ),
          _SidebarAction(
            icon: Icons.check_circle_outline,
            label: 'Mark Attendance',
            onTap: () => _onDestinationSelected(2),
          ),
          _SidebarAction(
            icon: Icons.assignment_outlined,
            label:
                'Pending Logs (${_pendingLogs.length - _submittedLogIds.length})',
            onTap: () => _onDestinationSelected(0),
          ),
          _SidebarAction(
            icon: Icons.event_note_outlined,
            label: 'Leave Requests',
            onTap: () => context.push('/teacher/leave'),
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
            label: 'Total Enrolled',
            value: DemoTeacherData.todayClasses()
                .fold<int>(0, (sum, s) => sum + s.enrolledCount)
                .toString(),
          ),
          _StatRow(
            label: 'Pending Logs',
            value: '${_pendingLogs.length - _submittedLogIds.length}',
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: () => ref.read(authProvider.notifier).logout(),
            icon: const Icon(Icons.logout_rounded, size: 18),
            label: const Text('Log Out'),
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
    required this.onClassTap,
    required this.onApplyLeave,
    required this.onViewTimetable,
  });

  final List<TeacherClassSession> todayClasses;
  final List<UpdateLogItem> pendingLogs;
  final Set<String> submittedLogIds;
  final ValueChanged<String> onSubmitLog;
  final ValueChanged<TeacherClassSession> onClassTap;
  final VoidCallback onApplyLeave;
  final VoidCallback onViewTimetable;

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, sizeClass) {
        final useTwoColumns = const UseTwoColumns().isAvailableAt(sizeClass);

        if (useTwoColumns) {
          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 2,
                    child: Column(
                      children: [
                        _buildQuickActionCards(context),
                        const SizedBox(height: 16),
                        _buildClassesColumn(context),
                      ],
                    ),
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
              ),
            ],
          );
        }

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildQuickActionCards(context),
            const SizedBox(height: 16),
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

  Widget _buildQuickActionCards(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Card(
            color: kColorPrimary.withValues(alpha: 0.05),
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(color: kColorPrimary.withValues(alpha: 0.15)),
            ),
            child: InkWell(
              onTap: onApplyLeave,
              borderRadius: BorderRadius.circular(14),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: kColorAccent.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.event_busy_rounded,
                          color: kColorAccent),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Apply for Leave',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleSmall
                                  ?.copyWith(fontWeight: FontWeight.w700)),
                          Text('Submit leave request',
                              style: Theme.of(context).textTheme.bodySmall),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Card(
            color: kColorPrimary.withValues(alpha: 0.05),
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(color: kColorPrimary.withValues(alpha: 0.15)),
            ),
            child: InkWell(
              onTap: onViewTimetable,
              borderRadius: BorderRadius.circular(14),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: kColorPrimary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.calendar_month_rounded,
                          color: kColorPrimary),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('My Schedule',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleSmall
                                  ?.copyWith(fontWeight: FontWeight.w700)),
                          Text('View weekly classes',
                              style: Theme.of(context).textTheme.bodySmall),
                        ],
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

  Widget _buildClassesColumn(BuildContext context) {
    return _SectionCard(
      title: 'My Classes Today',
      child: Column(
        children: todayClasses
            .map(
              (session) => InkWell(
                onTap: () => onClassTap(session),
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
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
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
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
                                    fontWeight: FontWeight.w700, fontSize: 15)),
                            const SizedBox(height: 4),
                            Text(
                                '${session.room} • ${session.enrolledCount} enrolled',
                                style: Theme.of(context).textTheme.bodySmall),
                          ],
                        ),
                      ),
                      FilledButton.tonal(
                        onPressed: () => onClassTap(session),
                        style: FilledButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                        ),
                        child: const Text('Attendance'),
                      ),
                    ],
                  ),
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
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(log.className,
                              style:
                                  const TextStyle(fontWeight: FontWeight.w600)),
                          Text('Awaiting lesson topic & attendance sync',
                              style: Theme.of(context).textTheme.bodySmall),
                        ],
                      ),
                    ),
                    if (submittedLogIds.contains(log.id))
                      const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.check_circle,
                              color: kColorSuccess, size: 18),
                          SizedBox(width: 6),
                          Text('Submitted',
                              style: TextStyle(
                                  color: kColorSuccess,
                                  fontWeight: FontWeight.w600)),
                        ],
                      )
                    else
                      FilledButton.tonal(
                        onPressed: () => onSubmitLog(log.id),
                        style: FilledButton.styleFrom(
                            minimumSize: const Size(80, 36)),
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
  const _TimetableTab({
    required this.sessions,
    required this.onSessionTap,
  });

  final List<TeacherClassSession> sessions;
  final ValueChanged<TeacherClassSession> onSessionTap;

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
                style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 16),
            ...sessions.map(
              (session) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Card(
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(16),
                    onTap: () => onSessionTap(session),
                    title: Text(session.subject,
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text(
                      '${formatTimestamp(session.scheduledStart)} • ${session.room}',
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('${session.enrolledCount} students'),
                        const SizedBox(width: 8),
                        const Icon(Icons.chevron_right, size: 20),
                      ],
                    ),
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
          DataColumn(label: Text('Action')),
        ],
        rows: sessions.map((session) {
          return DataRow(
            cells: [
              DataCell(Text(session.subject,
                  style: const TextStyle(fontWeight: FontWeight.w700))),
              DataCell(Text(formatTimestamp(session.scheduledStart))),
              DataCell(Text(session.room)),
              DataCell(Text('${session.enrolledCount}')),
              DataCell(
                FilledButton.tonal(
                  onPressed: () => onSessionTap(session),
                  child: const Text('Attendance'),
                ),
              ),
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
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Geo-Attendance',
                style: Theme.of(context).textTheme.headlineSmall),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: kColorSuccess.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Row(
                children: [
                  Icon(Icons.location_on, size: 16, color: kColorSuccess),
                  SizedBox(width: 4),
                  Text('GPS Verified',
                      style: TextStyle(
                          color: kColorSuccess,
                          fontWeight: FontWeight.w600,
                          fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        ...sessions.map(
          (session) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Card(
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(session.subject,
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 17)),
                        _StatusBadge(status: session.status),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                        '${formatShortTime(session.scheduledStart)} – ${formatShortTime(session.scheduledEnd)} • ${session.room}'),
                    const SizedBox(height: 4),
                    Text('${session.enrolledCount} Students Enrolled',
                        style: Theme.of(context).textTheme.bodySmall),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.fingerprint_rounded, size: 20),
                        onPressed: () => onMarkAttendance(session),
                        label: const Text('Open Geo-Attendance Verification'),
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
  const _ProfileTab({
    required this.onApplyLeave,
    required this.onLogout,
  });

  final VoidCallback onApplyLeave;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, sizeClass) {
        if (const UseTwoColumns().isAvailableAt(sizeClass)) {
          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Row(
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
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            CircleAvatar(
              radius: 42,
              backgroundColor: kColorPrimary.withValues(alpha: 0.1),
              child: const Icon(Icons.person, size: 48, color: kColorPrimary),
            ),
            const SizedBox(height: 12),
            Text(DemoTeacherData.teacherName,
                style:
                    const TextStyle(fontWeight: FontWeight.w700, fontSize: 20)),
            const SizedBox(height: 6),
            Text('${DemoTeacherData.branchName} • Senior Faculty',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: kColorText.withValues(alpha: 0.7),
                    )),
            const SizedBox(height: 20),
            const Divider(),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.badge_outlined, color: kColorPrimary),
              title: const Text('Employee ID'),
              trailing: const Text('TCH-2026-042',
                  style: TextStyle(fontWeight: FontWeight.w600)),
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.email_outlined, color: kColorPrimary),
              title: const Text('Email'),
              trailing: const Text('teacher@tms.edu.np',
                  style: TextStyle(fontWeight: FontWeight.w600)),
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.phone_outlined, color: kColorPrimary),
              title: const Text('Phone'),
              trailing: const Text('+977 9801234567',
                  style: TextStyle(fontWeight: FontWeight.w600)),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onLogout,
                icon: const Icon(Icons.logout_rounded),
                label: const Text('Log Out of Account'),
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => context.push('/teacher/change-password'),
              icon: const Icon(Icons.key_rounded),
              label: const Text('Change password'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLeaveRequests(BuildContext context) {
    return _SectionCard(
      title: 'Leave Requests & History',
      child: Column(
        children: [
          const ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.event_note, color: kColorWarning),
            title: Text('Personal Leave — 12 Jul'),
            subtitle: Text('Awaiting Branch Admin approval'),
            trailing: Text('Pending',
                style: TextStyle(
                    color: kColorWarning, fontWeight: FontWeight.w600)),
          ),
          const Divider(),
          const ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.check_circle, color: kColorSuccess),
            title: Text('Medical Leave — 24 Jun'),
            subtitle: Text('Approved by Branch Admin'),
            trailing: Text('Approved',
                style: TextStyle(
                    color: kColorSuccess, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton.tonalIcon(
              onPressed: onApplyLeave,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Apply for Leave'),
            ),
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
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.menu_book_outlined,
                          size: 20, color: kColorPrimary),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Text('Class ${index + 1} Submissions')),
                    Text('${18 + index * 4} turned in',
                        style: const TextStyle(fontWeight: FontWeight.w600)),
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

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: kColorText.withValues(alpha: 0.08)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
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
    final (color, label) = switch (status) {
      ClassSessionStatus.completed => (kColorSuccess, 'COMPLETED'),
      ClassSessionStatus.inProgress => (kColorAccent, 'IN PROGRESS'),
      ClassSessionStatus.scheduled => (kColorPrimary, 'SCHEDULED'),
      ClassSessionStatus.cancelled => (kColorWarning, 'CANCELLED'),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style:
            TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700),
      ),
    );
  }
}
