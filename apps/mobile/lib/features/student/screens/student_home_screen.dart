import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:tms_mobile/core/adaptive/capabilities.dart';
import 'package:tms_mobile/core/adaptive/widgets/adaptive_layout.dart';
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
        child: ResponsiveBuilder(
          builder: (context, sizeClass) {
            final useTwoColumns =
                const UseTwoColumns().isAvailableAt(sizeClass);
            final useThreeColumns =
                const UseThreeColumns().isAvailableAt(sizeClass);

            if (useThreeColumns) {
              return _buildThreeColumnLayout(
                context,
                nextEvent,
                overdue,
                unread,
              );
            }

            if (useTwoColumns) {
              return _buildTwoColumnLayout(
                context,
                nextEvent,
                overdue,
                unread,
              );
            }

            return _buildCompactLayout(
              context,
              nextEvent,
              overdue,
              unread,
            );
          },
        ),
      ),
    );
  }

  Widget _buildCompactLayout(
    BuildContext context,
    StudentAcademicEvent nextEvent,
    double overdue,
    int unread,
  ) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        _buildWelcomeCard(context, nextEvent),
        if (overdue > 0) ...[
          const SizedBox(height: StudentSpace.md),
          _buildOverdueCard(context, overdue),
        ],
        const SizedBox(height: StudentSpace.lg),
        _buildTimetableSection(context),
        const SizedBox(height: StudentSpace.sm),
        _buildHomeworkSection(context),
        const SizedBox(height: StudentSpace.sm),
        _buildQuickActions(context),
      ],
    );
  }

  Widget _buildTwoColumnLayout(
    BuildContext context,
    StudentAcademicEvent nextEvent,
    double overdue,
    int unread,
  ) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          flex: 2,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 8, 12, 24),
            children: [
              _buildWelcomeCard(context, nextEvent),
              if (overdue > 0) ...[
                const SizedBox(height: StudentSpace.md),
                _buildOverdueCard(context, overdue),
              ],
              const SizedBox(height: StudentSpace.lg),
              _buildTimetableSection(context),
              const SizedBox(height: StudentSpace.sm),
              _buildHomeworkSection(context),
            ],
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          flex: 1,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(12, 8, 24, 24),
            children: [
              _buildQuickActions(context, isSidebar: true),
              const SizedBox(height: StudentSpace.lg),
              _buildNextEventCard(context, nextEvent),
              const SizedBox(height: StudentSpace.lg),
              _buildCertificatesCard(context),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildThreeColumnLayout(
    BuildContext context,
    StudentAcademicEvent nextEvent,
    double overdue,
    int unread,
  ) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Left sidebar - Quick actions & profile
        SizedBox(
          width: 280,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _buildProfileSidebar(context),
              const SizedBox(height: StudentSpace.lg),
              _buildQuickActions(context, isSidebar: true),
            ],
          ),
        ),
        const VerticalDivider(width: 1),
        // Main content
        Expanded(
          flex: 2,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 8, 12, 24),
            children: [
              _buildWelcomeCard(context, nextEvent),
              if (overdue > 0) ...[
                const SizedBox(height: StudentSpace.md),
                _buildOverdueCard(context, overdue),
              ],
              const SizedBox(height: StudentSpace.lg),
              _buildTimetableSection(context),
              const SizedBox(height: StudentSpace.sm),
              _buildHomeworkSection(context),
            ],
          ),
        ),
        const VerticalDivider(width: 1),
        // Right sidebar - Events, certificates, stats
        SizedBox(
          width: 300,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _buildNextEventCard(context, nextEvent),
              const SizedBox(height: StudentSpace.lg),
              _buildCertificatesCard(context),
              const SizedBox(height: StudentSpace.lg),
              _buildStatsSidebar(context),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildWelcomeCard(
      BuildContext context, StudentAcademicEvent nextEvent) {
    return Container(
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
              const Icon(Icons.schedule_rounded, color: StudentColors.accent),
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
    );
  }

  Widget _buildOverdueCard(BuildContext context, double overdue) {
    return Card(
      color: StudentColors.error.withValues(alpha: .06),
      child: InkWell(
        borderRadius: BorderRadius.circular(StudentRadius.card),
        onTap: () => context.go('/student/fees'),
        child: Padding(
          padding: const EdgeInsets.all(StudentSpace.md),
          child: Row(
            children: [
              const Icon(Icons.lock_rounded, color: StudentColors.error),
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
    );
  }

  Widget _buildTimetableSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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
      ],
    );
  }

  Widget _buildHomeworkSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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
      ],
    );
  }

  Widget _buildQuickActions(BuildContext context, {bool isSidebar = false}) {
    final actions = [
      _QuickActionData(
        icon: Icons.fact_check_outlined,
        label: 'Attendance',
        value: '75%',
        onTap: () => context.push('/student/attendance'),
      ),
      _QuickActionData(
        icon: Icons.show_chart_rounded,
        label: 'Latest score',
        value: '88%',
        onTap: () => context.go('/student/academics'),
      ),
      _QuickActionData(
        icon: Icons.workspace_premium_outlined,
        label: 'Certificates',
        value: '${StudentDemoData.certificates.length}',
        onTap: () => context.push('/student/certificates'),
      ),
      _QuickActionData(
        icon: Icons.event_outlined,
        label: 'Next event',
        value:
            '${StudentDemoData.events.first.date.day}/${StudentDemoData.events.first.date.month}',
        onTap: () => context.push('/student/calendar'),
      ),
    ];

    if (isSidebar) {
      return Column(
        children: actions
            .map((action) => Padding(
                  padding: const EdgeInsets.only(bottom: StudentSpace.sm),
                  child: _QuickAction(
                    icon: action.icon,
                    label: action.label,
                    value: action.value,
                    onTap: action.onTap,
                  ),
                ))
            .toList(),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Your record', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: StudentSpace.sm),
        Row(
          children: [
            Expanded(
              child: _QuickAction(
                icon: actions[0].icon,
                label: actions[0].label,
                value: actions[0].value,
                onTap: actions[0].onTap,
              ),
            ),
            const SizedBox(width: StudentSpace.sm),
            Expanded(
              child: _QuickAction(
                icon: actions[1].icon,
                label: actions[1].label,
                value: actions[1].value,
                onTap: actions[1].onTap,
              ),
            ),
          ],
        ),
        const SizedBox(height: StudentSpace.sm),
        Row(
          children: [
            Expanded(
              child: _QuickAction(
                icon: actions[2].icon,
                label: actions[2].label,
                value: actions[2].value,
                onTap: actions[2].onTap,
              ),
            ),
            const SizedBox(width: StudentSpace.sm),
            Expanded(
              child: _QuickAction(
                icon: actions[3].icon,
                label: actions[3].label,
                value: actions[3].value,
                onTap: actions[3].onTap,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildNextEventCard(BuildContext context, StudentAcademicEvent event) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(StudentSpace.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.event_outlined, color: StudentColors.primary),
                const SizedBox(width: StudentSpace.sm),
                Text('Upcoming Events',
                    style: Theme.of(context).textTheme.titleMedium),
              ],
            ),
            const SizedBox(height: StudentSpace.md),
            ...StudentDemoData.events.take(3).map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: StudentSpace.sm),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: StudentColors.primary.withValues(alpha: 0.1),
                          borderRadius:
                              BorderRadius.circular(StudentRadius.card),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              '${e.date.day}',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleLarge
                                  ?.copyWith(
                                    color: StudentColors.primary,
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                            Text(
                              _monthShort(e.date.month),
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    color: StudentColors.primary,
                                  ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: StudentSpace.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(e.title,
                                style: Theme.of(context).textTheme.titleSmall),
                            Text(
                              '${e.details} · ${_formatTime(e.date)}',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  Widget _buildCertificatesCard(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(StudentSpace.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.workspace_premium_outlined,
                    color: StudentColors.primary),
                const SizedBox(width: StudentSpace.sm),
                Text('Certificates',
                    style: Theme.of(context).textTheme.titleMedium),
                const Spacer(),
                TextButton(
                  onPressed: () => context.go('/student/certificates'),
                  child: const Text('View All'),
                ),
              ],
            ),
            const SizedBox(height: StudentSpace.md),
            ...StudentDemoData.certificates.take(2).map((cert) => Padding(
                  padding: const EdgeInsets.only(bottom: StudentSpace.sm),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: StudentColors.accent.withValues(alpha: 0.1),
                          borderRadius:
                              BorderRadius.circular(StudentRadius.card),
                        ),
                        child: const Icon(Icons.star_rounded,
                            color: StudentColors.accent),
                      ),
                      const SizedBox(width: StudentSpace.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(cert.title,
                                style: Theme.of(context).textTheme.titleSmall),
                            Text(
                              'Issued ${_shortDate(cert.issuedAt)}',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileSidebar(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(StudentSpace.md),
        child: Column(
          children: [
            CircleAvatar(
              radius: 32,
              backgroundColor: StudentColors.primary.withValues(alpha: 0.1),
              child: const Icon(Icons.person,
                  size: 32, color: StudentColors.primary),
            ),
            const SizedBox(height: StudentSpace.md),
            Text(
              'Aarav Sharma',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: StudentSpace.xxs),
            Text(
              'Grade 8 · Baneshwor Branch',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: StudentColors.mutedText,
                  ),
            ),
            const SizedBox(height: StudentSpace.md),
            const Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _ProfileStat(label: 'Attendance', value: '75%'),
                _ProfileStat(label: 'Score', value: '88%'),
                _ProfileStat(label: 'Rank', value: '12/45'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsSidebar(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(StudentSpace.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('This Month', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: StudentSpace.md),
            const _StatRow(label: 'Sessions', value: '42'),
            const _StatRow(label: 'Hours', value: '84h'),
            const _StatRow(label: 'Assignments', value: '18'),
            const _StatRow(label: 'Avg Score', value: '87%'),
          ],
        ),
      ),
    );
  }
}

class _ProfileStat extends StatelessWidget {
  const _ProfileStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: StudentColors.primary,
                )),
        Text(label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: StudentColors.mutedText,
                )),
      ],
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
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: StudentColors.primary,
                ),
          ),
        ],
      ),
    );
  }
}

class _QuickActionData {
  const _QuickActionData({
    required this.icon,
    required this.label,
    required this.value,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onTap;
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
String _monthShort(int month) => const [
      '',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ][month];
String _time(DateTime value) {
  final hour = value.hour % 12 == 0 ? 12 : value.hour % 12;
  return '$hour:${value.minute.toString().padLeft(2, '0')}';
}

String _meridiem(DateTime value) => value.hour < 12 ? 'AM' : 'PM';
String _formatTime(DateTime value) {
  final hour = value.hour % 12 == 0 ? 12 : value.hour % 12;
  return '$hour:${value.minute.toString().padLeft(2, '0')} ${value.hour < 12 ? 'AM' : 'PM'}';
}
