import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:tms_mobile/core/adaptive/capabilities.dart';
import 'package:tms_mobile/core/adaptive/widgets/adaptive_layout.dart';
import 'package:tms_mobile/core/providers/auth_provider.dart';
import 'package:tms_mobile/core/theme/app_colors.dart';

/// Branch-scoped operational dashboard for the API role `BRANCH_ADMIN`.
///
/// The product-facing label is Branch Manager. All values are demo presentation
/// data until the authorized branch-admin repository is connected.
class BranchHomeScreen extends ConsumerWidget {
  const BranchHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Branch Manager'),
        actions: [
          IconButton(
            tooltip: 'Change password',
            icon: const Icon(Icons.key_rounded),
            onPressed: () => context.push('/branch/change-password'),
          ),
          IconButton(
            tooltip: 'Log out',
            icon: const Icon(Icons.logout_rounded),
            onPressed: () => ref.read(authProvider.notifier).logout(),
          ),
        ],
      ),
      body: SafeArea(
        child: ResponsiveBuilder(
          builder: (context, sizeClass) {
            final columns =
                const UseTwoColumns().isAvailableAt(sizeClass) ? 2 : 1;
            return ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(
                  'Baneshwor Branch',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Branch operations overview',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: kColorText.withValues(alpha: 0.65),
                      ),
                ),
                const SizedBox(height: 20),
                GridView.count(
                  crossAxisCount: columns,
                  childAspectRatio: columns == 1 ? 3.0 : 2.3,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  children: const [
                    _BranchKpi(
                        label: 'Attendance today',
                        value: '94%',
                        icon: Icons.fact_check_outlined,
                        color: kColorSuccess),
                    _BranchKpi(
                        label: 'Staff on duty',
                        value: '28 / 31',
                        icon: Icons.badge_outlined,
                        color: kColorPrimary),
                    _BranchKpi(
                        label: 'L1 approvals',
                        value: '6',
                        icon: Icons.approval_outlined,
                        color: kColorWarning),
                    _BranchKpi(
                        label: 'Open resource tasks',
                        value: '4',
                        icon: Icons.handyman_outlined,
                        color: kColorInfo),
                  ],
                ),
                const SizedBox(height: 28),
                Text('Operations',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                _ActionCard(
                  icon: Icons.people_outline,
                  title: 'People',
                  subtitle: 'Manage branch staff and student records',
                  onTap: () {},
                ),
                const SizedBox(height: 12),
                _ActionCard(
                  icon: Icons.approval_outlined,
                  title: 'Approvals',
                  subtitle: 'Review branch leave and petty-cash requests',
                  onTap: () {},
                ),
                const SizedBox(height: 12),
                _ActionCard(
                  icon: Icons.inventory_2_outlined,
                  title: 'Resources & tasks',
                  subtitle: 'Monitor rooms, equipment, and maintenance tasks',
                  onTap: () {},
                ),
                const SizedBox(height: 28),
                Text('Priority items',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                const _PriorityItem(
                  title: 'Science lab projector repair',
                  detail: 'Assigned to maintenance · Due today',
                  color: kColorError,
                ),
                const SizedBox(height: 10),
                const _PriorityItem(
                  title: 'Three leave requests awaiting L1 review',
                  detail: 'Staff operations · Review before 5:00 PM',
                  color: kColorWarning,
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _BranchKpi extends StatelessWidget {
  const _BranchKpi({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.withValues(alpha: 0.12),
              foregroundColor: color,
              child: Icon(icon),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(value, style: Theme.of(context).textTheme.titleLarge),
                  Text(label, style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  const _ActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Icon(icon, color: kColorPrimary),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right_rounded),
        onTap: onTap,
      ),
    );
  }
}

class _PriorityItem extends StatelessWidget {
  const _PriorityItem({
    required this.title,
    required this.detail,
    required this.color,
  });

  final String title;
  final String detail;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Icon(Icons.priority_high_rounded, color: color),
        title: Text(title),
        subtitle: Text(detail),
      ),
    );
  }
}
