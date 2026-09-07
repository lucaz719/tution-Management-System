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
            onSubmitUpdate: (pending) =>
                _showDailyUpdateDialog(context, vm, pending),
          ),
        );
    }
  }

  Future<void> _showDailyUpdateDialog(
    BuildContext context,
    TeacherPortalViewModel vm,
    TeacherPendingUpdate pending,
  ) async {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => _DailyUpdateDialog(
        onSubmit: (content) => vm.submitSessionUpdate(
          sessionId: pending.sessionId,
          updateContent: content,
        ),
      ),
    );
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

class _DailyUpdateDialog extends StatefulWidget {
  const _DailyUpdateDialog({required this.onSubmit});

  final Future<bool> Function(String content) onSubmit;

  @override
  State<_DailyUpdateDialog> createState() => _DailyUpdateDialogState();
}

class _DailyUpdateDialogState extends State<_DailyUpdateDialog> {
  final _controller = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Submit daily update'),
      content: TextField(
        controller: _controller,
        autofocus: true,
        maxLines: 5,
        maxLength: 5000,
        decoration: const InputDecoration(
          labelText: 'What was covered?',
          alignLabelWithHint: true,
        ),
      ),
      actions: [
        TextButton(
          onPressed: _submitting ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _submitting
              ? null
              : () async {
                  setState(() => _submitting = true);
                  final submitted = await widget.onSubmit(_controller.text);
                  if (!context.mounted) return;
                  if (submitted) {
                    Navigator.of(context).pop();
                  } else {
                    setState(() => _submitting = false);
                  }
                },
          child: Text(_submitting ? 'Submitting…' : 'Submit update'),
        ),
      ],
    );
  }
}

class _TodayTab extends StatelessWidget {
  const _TodayTab({
    required this.workspace,
    required this.onMarkAttendance,
    required this.onSubmitUpdate,
  });

  final TeacherWorkspace workspace;
  final void Function(TeacherTodayClass) onMarkAttendance;
  final void Function(TeacherPendingUpdate) onSubmitUpdate;

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
        if (workspace.pendingUpdates.isNotEmpty) ...[
          const SizedBox(height: 8),
          for (final pending in workspace.pendingUpdates)
            Card(
              child: ListTile(
                title: Text('${pending.courseName} — ${pending.className}'),
                subtitle: pending.date == null
                    ? null
                    : Text(pending.date!.toLocal().toString().split(' ').first),
                trailing: FilledButton.tonal(
                  onPressed: () => onSubmitUpdate(pending),
                  child: const Text('Submit daily update'),
                ),
              ),
            ),
        ],
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
