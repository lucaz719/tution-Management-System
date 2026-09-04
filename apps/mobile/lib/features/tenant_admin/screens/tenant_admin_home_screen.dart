import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tms_mobile/core/providers/auth_provider.dart';
import 'package:tms_mobile/features/tenant_admin/data/tenant_admin_demo_data.dart';
import 'package:tms_mobile/features/tenant_admin/models/tenant_admin_dashboard_models.dart';

/// Tenant-wide operational dashboard using presentation-only demo data.
///
/// TODO(tenant-admin): Supply repository-backed data through Riverpod providers
/// and replace the local action feedback with tenant-admin navigation.
class TenantAdminHomeScreen extends ConsumerWidget {
  const TenantAdminHomeScreen({super.key});

  static const _pagePadding = 20.0;
  static const _sectionSpacing = 24.0;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tenant operations'),
        actions: [
          IconButton(
            tooltip: 'Notifications',
            onPressed: () => _showDemoMessage(context, 'Notifications'),
            icon: const Icon(Icons.notifications_none_rounded),
          ),
          IconButton(
            tooltip: 'Change password',
            onPressed: () => context.push('/tenant/change-password'),
            icon: const Icon(Icons.key_rounded),
          ),
          IconButton(
            tooltip: 'Log out',
            onPressed: () => ref.read(authProvider.notifier).logout(),
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isExpanded = constraints.maxWidth >= 840;
            final maxContentWidth = isExpanded ? 1200.0 : 800.0;

            return Align(
              alignment: Alignment.topCenter,
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: maxContentWidth),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(_pagePadding),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Tenant-wide overview',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Monitor branches, people, and approvals across your organisation.',
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                      const SizedBox(height: _sectionSpacing),
                      const _KpiGrid(kpis: TenantAdminDemoData.kpis),
                      const SizedBox(height: _sectionSpacing),
                      if (isExpanded)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Expanded(flex: 3, child: _BranchOverview()),
                            const SizedBox(width: _sectionSpacing),
                            Expanded(
                              flex: 2,
                              child: _QuickActions(
                                onActionSelected: (label) =>
                                    _showDemoMessage(context, label),
                              ),
                            ),
                          ],
                        )
                      else ...[
                        const _BranchOverview(),
                        const SizedBox(height: _sectionSpacing),
                        _QuickActions(
                          onActionSelected: (label) =>
                              _showDemoMessage(context, label),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  void _showDemoMessage(BuildContext context, String destination) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$destination is a demo action.')),
    );
  }
}

class _KpiGrid extends StatelessWidget {
  const _KpiGrid({required this.kpis});

  final List<TenantAdminKpi> kpis;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 840
            ? 4
            : constraints.maxWidth >= 600
                ? 2
                : 1;
        const gap = 12.0;
        final itemWidth =
            (constraints.maxWidth - gap * (columns - 1)) / columns;

        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: [
            for (final kpi in kpis)
              SizedBox(width: itemWidth, child: _KpiCard(kpi: kpi)),
          ],
        );
      },
    );
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({required this.kpi});

  final TenantAdminKpi kpi;

  @override
  Widget build(BuildContext context) {
    final isApproval = kpi.label == 'Pending L2 approvals';
    final color =
        isApproval ? Colors.deepOrange : Theme.of(context).colorScheme.primary;

    return Semantics(
      label: '${kpi.label}: ${kpi.value}. ${kpi.supportingText}',
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(kpi.label, style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 12),
              Text(
                kpi.value,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: color,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 4),
              Text(kpi.supportingText,
                  style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}

class _BranchOverview extends StatelessWidget {
  const _BranchOverview();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Branch overview', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 4),
        Text(
          'Staffing, enrolment, and approval workload by branch.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 12),
        Card(
          child: Column(
            children: [
              for (final branch in TenantAdminDemoData.branches)
                _BranchTile(branch: branch),
            ],
          ),
        ),
      ],
    );
  }
}

class _BranchTile extends StatelessWidget {
  const _BranchTile({required this.branch});

  final TenantBranchOverview branch;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '${branch.name}, ${branch.location}: ${branch.staffCount} staff, '
          '${branch.studentCount} students, ${branch.pendingApprovals} pending approvals',
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        leading: CircleAvatar(
          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
          child: Icon(
            Icons.account_balance_outlined,
            color: Theme.of(context).colorScheme.onPrimaryContainer,
          ),
        ),
        title: Text(branch.name),
        subtitle: Text(
            '${branch.location} · ${branch.staffCount} staff · ${branch.studentCount} students'),
        trailing: _ApprovalBadge(count: branch.pendingApprovals),
      ),
    );
  }
}

class _ApprovalBadge extends StatelessWidget {
  const _ApprovalBadge({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.deepOrange.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        '$count pending',
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: Colors.deepOrange.shade900,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

class _QuickActions extends StatelessWidget {
  const _QuickActions({required this.onActionSelected});

  final ValueChanged<String> onActionSelected;

  @override
  Widget build(BuildContext context) {
    const actions = [
      _QuickActionData(
        label: 'People',
        description: 'Manage staff and student records.',
        icon: Icons.groups_outlined,
      ),
      _QuickActionData(
        label: 'Reports',
        description: 'Review tenant-wide operational reports.',
        icon: Icons.assessment_outlined,
      ),
      _QuickActionData(
        label: 'Approvals',
        description: 'Review requests awaiting L2 approval.',
        icon: Icons.fact_check_outlined,
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Quick actions', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 4),
        Text('Shortcuts for tenant administration.',
            style: Theme.of(context).textTheme.bodyMedium),
        const SizedBox(height: 12),
        for (final action in actions) ...[
          _QuickActionCard(
              action: action, onTap: () => onActionSelected(action.label)),
          const SizedBox(height: 12),
        ],
      ],
    );
  }
}

class _QuickActionData {
  const _QuickActionData({
    required this.label,
    required this.description,
    required this.icon,
  });

  final String label;
  final String description;
  final IconData icon;
}

class _QuickActionCard extends StatelessWidget {
  const _QuickActionCard({required this.action, required this.onTap});

  final _QuickActionData action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Open ${action.label}',
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(action.icon, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(action.label,
                          style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 2),
                      Text(action.description,
                          style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
