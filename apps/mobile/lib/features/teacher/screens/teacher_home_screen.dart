/// API-backed teacher home screen (MVVM).
///
/// Reads [TeacherPortalViewModel] (one `GET /api/teacher/workspace` per
/// load). Covers loading / empty / error / denied / offline states; the
/// offline banner shows when connectivity drops but cached data exists.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:tms_mobile/core/sync/sync.dart';

import 'package:tms_mobile/core/theme/app_colors.dart';
import 'package:tms_mobile/features/teacher/models/teacher_models.dart';
import 'package:tms_mobile/features/teacher/models/teacher_portal_dto.dart';
import 'package:tms_mobile/features/teacher/screens/geo_attendance_screen.dart';
import 'package:tms_mobile/features/teacher/viewmodels/teacher_portal_viewmodel.dart';
import 'package:tms_mobile/features/teacher/widgets/teacher_record_states.dart';

class TeacherHomeScreen extends ConsumerStatefulWidget {
  const TeacherHomeScreen({super.key});

  @override
  ConsumerState<TeacherHomeScreen> createState() => _TeacherHomeScreenState();
}

class _TeacherHomeScreenState extends ConsumerState<TeacherHomeScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(teacherPortalViewModelProvider);
    final vm = ref.read(teacherPortalViewModelProvider.notifier);
    final connectivity = ref.watch(connectivityMonitorProvider);
    final offline = connectivity == ConnectivityState.offline;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Teacher Home',
          style:
              GoogleFonts.fraunces(fontWeight: FontWeight.w700, fontSize: 22),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month_outlined),
            tooltip: 'Timetable',
            onPressed: () => context.push('/teacher/timetable'),
          ),
          IconButton(
            icon: const Icon(Icons.event_note_outlined),
            tooltip: 'Leave requests',
            onPressed: () => context.push('/teacher/leave'),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            if (offline && state.hasData) const TeacherOfflineBar(),
            Expanded(child: _body(context, state, vm, offline)),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: 'Today'),
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

  Widget _body(
    BuildContext context,
    TeacherPortalState state,
    TeacherPortalViewModel vm,
    bool offline,
  ) {
    if (state.isLoading && !state.hasData) {
      return const TeacherLoadingView(message: 'Loading your classes…');
    }
    if (state.isDenied && !state.hasData) {
      return TeacherDeniedView(message: state.error);
    }
    if (state.isOffline && !state.hasData) {
      return TeacherOfflineView(onRetry: vm.load);
    }
    if (state.hasError && !state.hasData) {
      return TeacherErrorView(
        message: state.error ?? 'Could not load the teacher workspace.',
        onRetry: vm.load,
      );
    }
    final workspace = state.workspace;
    if (workspace == null ||
        workspace.todayClasses.isEmpty && workspace.classes.isEmpty) {
      if (workspace != null &&
          workspace.todayClasses.isEmpty &&
          workspace.classes.isEmpty) {
        return const TeacherEmptyView(
          icon: Icons.event_available_rounded,
          title: 'No classes assigned',
          message: 'You have no classes today or this week.',
        );
      }
      return TeacherEmptyView(
        icon: Icons.event_available_rounded,
        title: 'No data',
        message: state.error ?? 'Nothing to show right now.',
      );
    }
    switch (_tab) {
      case 1:
        return _AttendanceTab(
          workspace: workspace,
          onMarkAttendance: (today) => _openGeo(context, workspace, today),
        );
      case 2:
        return _ProfileTab(workspace: workspace);
      case 0:
      default:
        return RefreshIndicator(
          onRefresh: vm.refresh,
          child: _TodayTab(
            workspace: workspace,
            onMarkAttendance: (today) => _openGeo(context, workspace, today),
          ),
        );
    }
  }

  void _openGeo(
    BuildContext context,
    TeacherWorkspace workspace,
    TeacherTodayClass today,
  ) {
    final match = workspace.classes.where((c) => c.id == today.classId);
    final branch = match.isEmpty ? null : match.first.branch;
    final now = DateTime.now();
    final session = TeacherClassSession(
      id: today.sessionId,
      subject: '${today.courseName} — ${today.className}',
      room: today.scheduleLabel ?? '',
      branch: today.branchName ?? branch?.name ?? '',
      enrolledCount: match.isEmpty ? 0 : match.first.studentCount,
      status: ClassSessionStatus.scheduled,
      scheduledStart: now,
      scheduledEnd: now,
    );
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => GeoAttendanceScreen(
          session: session,
          branchId: branch?.id,
          branchRadiusMeters: branch?.radiusMeters,
          branchLatitude: branch?.latitude,
          branchLongitude: branch?.longitude,
        ),
      ),
    );
  }
}

class _TodayTab extends StatelessWidget {
  const _TodayTab({required this.workspace, required this.onMarkAttendance});

  final TeacherWorkspace workspace;
  final void Function(TeacherTodayClass) onMarkAttendance;

  @override
  Widget build(BuildContext context) {
    final items = workspace.todayClasses;
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _HeaderCard(workspace: workspace),
        const SizedBox(height: 16),
        Text('Today\'s classes (${items.length})',
            style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (items.isEmpty)
          const TeacherEmptyView(
            icon: Icons.event_available_rounded,
            title: 'No classes today',
            message: 'Enjoy the day — nothing scheduled.',
          )
        else
          for (final item in items)
            _ClassCard(item: item, onTap: () => onMarkAttendance(item)),
        const SizedBox(height: 16),
        Text('Pending daily updates: ${workspace.pendingUpdateCount}',
            style: Theme.of(context).textTheme.bodyMedium),
      ],
    );
  }
}

class _HeaderCard extends StatelessWidget {
  const _HeaderCard({required this.workspace});

  final TeacherWorkspace workspace;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(workspace.teacherName,
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.w700)),
            Text(workspace.designation,
                style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                Chip(
                  label: Text(
                      workspace.checkedIn ? 'Checked in' : 'Not checked in'),
                  avatar: Icon(
                    workspace.checkedIn ? Icons.check_circle : Icons.schedule,
                    size: 16,
                    color: kColorPrimary,
                  ),
                ),
                if (workspace.attendanceRate != null)
                  Chip(label: Text('Attendance ${workspace.attendanceRate}%')),
                if (workspace.presentDays != null)
                  Chip(label: Text('Present ${workspace.presentDays}d')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ClassCard extends StatelessWidget {
  const _ClassCard({required this.item, required this.onTap});

  final TeacherTodayClass item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(item.courseName,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(
          '${item.className}${item.branchName == null ? '' : ' • ${item.branchName}'}${item.scheduleLabel == null ? '' : '\n${item.scheduleLabel}'}',
        ),
        isThreeLine: item.scheduleLabel != null,
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (item.dailyUpdateSubmitted)
              const Icon(Icons.check_circle, color: Colors.green, size: 20)
            else
              const Icon(Icons.pending_outlined, size: 20),
            const SizedBox(width: 8),
            FilledButton.tonal(
              onPressed: onTap,
              child: const Text('Attend'),
            ),
          ],
        ),
      ),
    );
  }
}

class _AttendanceTab extends StatelessWidget {
  const _AttendanceTab(
      {required this.workspace, required this.onMarkAttendance});

  final TeacherWorkspace workspace;
  final void Function(TeacherTodayClass) onMarkAttendance;

  @override
  Widget build(BuildContext context) {
    final stamps = workspace.stamps;
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('Today\'s stamps', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (stamps.isEmpty)
          const TeacherEmptyView(
            icon: Icons.fingerprint_outlined,
            title: 'No stamps yet',
            message: 'Mark your attendance from a class below.',
          )
        else
          for (final stamp in stamps.take(10))
            ListTile(
              leading: const Icon(Icons.fingerprint),
              title: Text(stamp.stampType),
              subtitle: Text(
                '${stamp.branchName ?? ''}${stamp.timestamp == null ? '' : ' • ${stamp.timestamp!.toLocal()}'}',
              ),
            ),
        const SizedBox(height: 16),
        Text('Mark attendance', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (workspace.todayClasses.isEmpty)
          const TeacherEmptyView(
            icon: Icons.event_available_rounded,
            title: 'No classes today',
            message: 'Nothing to mark attendance for.',
          )
        else
          for (final item in workspace.todayClasses)
            _ClassCard(item: item, onTap: () => onMarkAttendance(item)),
      ],
    );
  }
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab({required this.workspace});

  final TeacherWorkspace workspace;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        ListTile(
          leading: const Icon(Icons.person),
          title: Text(workspace.teacherName),
          subtitle: Text(workspace.designation),
        ),
        const Divider(),
        ListTile(
          leading: const Icon(Icons.business_outlined),
          title: const Text('Branches'),
          subtitle: Text(
            workspace.branches.isEmpty
                ? 'None assigned'
                : workspace.branches.map((b) => b.name).join(', '),
          ),
        ),
        ListTile(
          leading: const Icon(Icons.class_outlined),
          title: const Text('Assigned classes'),
          subtitle: Text('${workspace.classes.length}'),
        ),
        ListTile(
          leading: const Icon(Icons.event_note_outlined),
          title: const Text('Leave requests'),
          subtitle: Text('${workspace.leaves.length}'),
          onTap: () => context.push('/teacher/leave'),
        ),
      ],
    );
  }
}
