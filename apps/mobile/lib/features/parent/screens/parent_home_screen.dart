import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tms_mobile/core/providers/auth_provider.dart';
import 'package:tms_mobile/features/parent/widgets/child_switcher_bar.dart';
import 'package:tms_mobile/features/parent/widgets/parent_portal_state_view.dart';
import 'package:tms_mobile/shared/widgets/kpi_card.dart';

class ParentHomeScreen extends ConsumerWidget {
  const ParentHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Parent Dashboard'),
        actions: [
          IconButton(
            tooltip: 'Change password',
            onPressed: () => context.push('/parent/change-password'),
            icon: const Icon(Icons.key_rounded),
          ),
          IconButton(
            tooltip: 'Logout',
            onPressed: () => ref.read(authProvider.notifier).logout(),
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
      body: SafeArea(
        child: ParentPortalStateView(
          builder: (context, portal, child) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Hello, ${user?.name ?? 'Parent'}',
                style: Theme.of(context).textTheme.displaySmall,
              ),
              const SizedBox(height: 8),
              Text(
                'Track attendance, academic progress, and payments for ${child.name}.',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 20),
              const ChildSwitcherBar(),
              const SizedBox(height: 20),
              LayoutBuilder(
                builder: (context, constraints) {
                  final width = constraints.maxWidth >= 620
                      ? (constraints.maxWidth - 14) / 2
                      : constraints.maxWidth;
                  return Wrap(
                    spacing: 14,
                    runSpacing: 14,
                    children: [
                      SizedBox(
                        width: width,
                        child: KpiCard(
                          title: 'Attendance rate',
                          value: '${child.attendanceRate}%',
                          deltaText:
                              '${portal.presentCount} present · ${portal.absentCount} absent',
                        ),
                      ),
                      SizedBox(
                        width: width,
                        child: KpiCard(
                          title: 'Fees due',
                          value: _money(portal.outstandingTotal),
                          deltaText:
                              '${portal.invoices.where((item) => item.isDue).length} invoices open',
                          deltaPositive: portal.outstandingTotal == 0,
                        ),
                      ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 20),
              if (portal.sessions.isNotEmpty) ...[
                Text("Today's classes",
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 10),
                for (final session in portal.sessions)
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.schedule_rounded),
                      title: Text(session.subject),
                      subtitle: Text(
                        '${session.time}–${session.endTime} · ${session.teacher}',
                      ),
                      trailing: Text(session.room),
                    ),
                  ),
                const SizedBox(height: 10),
              ],
              _ParentActionTile(
                title: 'Attendance details',
                subtitle: 'Check daily presence, absences, and late arrivals',
                onTap: () => context.go('/parent/attendance'),
              ),
              const SizedBox(height: 14),
              _ParentActionTile(
                title: 'Academics & performance',
                subtitle: 'Review teacher remarks and performance signals',
                onTap: () => context.push('/parent/academics'),
              ),
              const SizedBox(height: 14),
              _ParentActionTile(
                title: 'Fees & invoices',
                subtitle: 'Review dues and invoice breakdowns',
                onTap: () => context.go('/parent/fees'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _money(double amount) {
  final digits = amount.round().toString();
  final formatted = digits.replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => ',',
  );
  return 'NPR $formatted';
}

class _ParentActionTile extends StatelessWidget {
  const _ParentActionTile({
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
        child: ListTile(
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          title: Text(title),
          subtitle: Text(subtitle),
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: onTap,
        ),
      );
}
