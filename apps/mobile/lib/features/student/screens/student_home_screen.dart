import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/student_demo_data.dart';
import '../models/student_portal_models.dart';
import '../student_design.dart';
import '../widgets/student_scaffold.dart';

class StudentHomeScreen extends StatelessWidget {
  const StudentHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final nextEvent = StudentDemoData.events.first;
    final overdue = StudentDemoData.invoices
        .where((invoice) => invoice.state == FeeDeadlineState.overdue)
        .fold<double>(0, (sum, invoice) => sum + invoice.netPayable);
    final unread =
        StudentDemoData.notices.where((notice) => !notice.isRead).length;

    return StudentScaffold(
      title: 'Student dashboard',
      selectedIndex: 0,
      actions: [
        Semantics(
          label: '$unread unread notifications',
          button: true,
          child: Badge(
            isLabelVisible: unread > 0,
            label: Text('$unread'),
            child: IconButton(
              tooltip: 'Notifications',
              onPressed: () => context.push('/student/notifications'),
              icon: const Icon(Icons.notifications_outlined),
            ),
          ),
        ),
        const SizedBox(width: StudentSpace.xs),
      ],
      body: RefreshIndicator(
        onRefresh: () async =>
            Future<void>.delayed(const Duration(milliseconds: 350)),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            Container(
              padding: const EdgeInsets.all(StudentSpace.lg),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [StudentColors.primaryDark, StudentColors.primary],
                ),
                borderRadius: BorderRadius.circular(StudentRadius.card),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Namaste, Aarav',
                    style: Theme.of(context)
                        .textTheme
                        .displaySmall
                        ?.copyWith(color: Colors.white),
                  ),
                  const SizedBox(height: StudentSpace.xs),
                  Text(
                    'Grade 8 · Baneshwor Branch',
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: Colors.white70),
                  ),
                  const SizedBox(height: StudentSpace.lg),
                  Row(
                    children: [
                      const Icon(Icons.schedule_rounded,
                          color: StudentColors.accent),
                      const SizedBox(width: StudentSpace.xs),
                      Text(
                        '${StudentDemoData.sessions.length} sessions today',
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(color: Colors.white),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (overdue > 0) ...[
              const SizedBox(height: StudentSpace.md),
              Card(
                color: StudentColors.error.withOpacity(.06),
                child: InkWell(
                  borderRadius: BorderRadius.circular(StudentRadius.card),
                  onTap: () => context.go('/student/fees'),
                  child: Padding(
                    padding: const EdgeInsets.all(StudentSpace.md),
                    child: Row(
                      children: [
                        const Icon(Icons.lock_rounded,
                            color: StudentColors.error),
                        const SizedBox(width: StudentSpace.sm),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Blocked — fee dues',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(color: StudentColors.error),
                              ),
                              const SizedBox(height: StudentSpace.xxs),
                              Text(
                                'NPR ${overdue.toStringAsFixed(0)} is overdue. View what is owed and the payment QR.',
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right_rounded),
                      ],
                    ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: StudentSpace.lg),
            _SectionHeader(
              title: "Today's timetable",
              action: 'Full timetable',
              onTap: () => context.push('/student/timetable'),
            ),
            const SizedBox(height: StudentSpace.sm),
            for (final session in StudentDemoData.sessions) ...[
              _SessionTile(session: session),
              const SizedBox(height: StudentSpace.sm),
            ],
            const SizedBox(height: StudentSpace.sm),
            _SectionHeader(
              title: 'Homework due soon',
              action: 'View all',
              onTap: () => context.go('/student/academics'),
            ),
            const SizedBox(height: StudentSpace.sm),
            for (final item in StudentDemoData.homework.take(2)) ...[
              Card(
                child: ListTile(
                  minTileHeight: 72,
                  leading: const Icon(Icons.assignment_outlined,
                      color: StudentColors.primary),
                  title: Text(item.title),
                  subtitle: Text('${item.subject} · Due ${_shortDate(item.dueAt)}'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.go('/student/academics'),
                ),
              ),
              const SizedBox(height: StudentSpace.sm),
            ],
            const SizedBox(height: StudentSpace.sm),
            Text('Your record', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: StudentSpace.sm),
            Row(
              children: [
                Expanded(
                  child: _QuickAction(
                    icon: Icons.fact_check_outlined,
                    label: 'Attendance',
                    value: '75%',
                    onTap: () => context.push('/student/attendance'),
                  ),
                ),
                const SizedBox(width: StudentSpace.sm),
                Expanded(
                  child: _QuickAction(
                    icon: Icons.show_chart_rounded,
                    label: 'Latest score',
                    value: '88%',
                    onTap: () => context.go('/student/academics'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: StudentSpace.sm),
            Row(
              children: [
                Expanded(
                  child: _QuickAction(
                    icon: Icons.workspace_premium_outlined,
                    label: 'Certificates',
                    value: '${StudentDemoData.certificates.length}',
                    onTap: () => context.push('/student/certificates'),
                  ),
                ),
                const SizedBox(width: StudentSpace.sm),
                Expanded(
                  child: _QuickAction(
                    icon: Icons.event_outlined,
                    label: 'Next event',
                    value: '${nextEvent.date.day}/${nextEvent.date.month}',
                    onTap: () => context.go('/student/calendar'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.action,
    required this.onTap,
  });
  final String title;
  final String action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(title, style: Theme.of(context).textTheme.titleLarge),
        ),
        TextButton(onPressed: onTap, child: Text(action)),
      ],
    );
  }
}

class _SessionTile extends StatelessWidget {
  const _SessionTile({required this.session});
  final StudentSession session;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(StudentSpace.md),
        child: Row(
          children: [
            SizedBox(
              width: 54,
              child: Column(
                children: [
                  Text(
                    _time(session.startsAt),
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(color: StudentColors.primaryDark),
                  ),
                  Text(_meridiem(session.startsAt),
                      style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            Container(
              width: 3,
              height: 48,
              margin: const EdgeInsets.symmetric(horizontal: StudentSpace.sm),
              decoration: BoxDecoration(
                color: StudentColors.primary,
                borderRadius: BorderRadius.circular(StudentRadius.pill),
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(session.subject,
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: StudentSpace.xxs),
                  Text(
                    '${session.teacher} · ${session.room}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            StudentStatusPill(
              label: session.type.label,
              icon: Icons.school_outlined,
              color: StudentColors.info,
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.value,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(StudentRadius.card),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(StudentSpace.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: StudentColors.primary),
              const SizedBox(height: StudentSpace.md),
              Text(value, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: StudentSpace.xxs),
              Text(label, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}

String _shortDate(DateTime value) => '${value.day}/${value.month}';
String _time(DateTime value) {
  final hour = value.hour % 12 == 0 ? 12 : value.hour % 12;
  return '$hour:${value.minute.toString().padLeft(2, '0')}';
}

String _meridiem(DateTime value) => value.hour < 12 ? 'AM' : 'PM';
