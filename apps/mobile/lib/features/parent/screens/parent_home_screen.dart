import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tms_mobile/core/providers/auth_provider.dart';
import 'package:tms_mobile/features/parent/widgets/child_switcher_bar.dart';
import 'package:tms_mobile/shared/widgets/kpi_card.dart';

class ParentHomeScreen extends ConsumerStatefulWidget {
  const ParentHomeScreen({super.key});

  @override
  ConsumerState<ParentHomeScreen> createState() => _ParentHomeScreenState();
}

class _ParentHomeScreenState extends ConsumerState<ParentHomeScreen> {
  final _children = const ['Aarav', 'Mira'];
  late String _selectedChild;

  @override
  void initState() {
    super.initState();
    _selectedChild = _children.first;
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Parent Dashboard'),
        actions: [
          IconButton(
            tooltip: 'Logout',
            onPressed: () => ref.read(authProvider.notifier).logout(),
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Hello, ${user?.name ?? 'Parent'}',
                  style: Theme.of(context).textTheme.displaySmall),
              const SizedBox(height: 8),
              Text(
                'Stay on top of attendance and payments for each child without switching devices or accounts.',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 20),
              ChildSwitcherBar(
                childrenNames: _children,
                selectedChild: _selectedChild,
                onChanged: (child) => setState(() => _selectedChild = child),
              ),
              const SizedBox(height: 20),
              const Row(
                children: [
                  Expanded(
                    child: KpiCard(
                      title: 'Attendance this month',
                      value: '94%',
                      deltaText: '+1.5% improvement',
                    ),
                  ),
                  SizedBox(width: 14),
                  Expanded(
                    child: KpiCard(
                      title: 'Fees due',
                      value: 'NPR 4,500',
                      deltaText: '2 invoices open',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _ParentActionTile(
                title: 'Attendance details',
                subtitle: 'Check daily presence, absences, and late arrivals',
                onTap: () => context.go('/parent/attendance'),
              ),
              const SizedBox(height: 14),
              _ParentActionTile(
                title: 'Fees & receipts',
                subtitle:
                    'Review dues, download receipts, and prep for payment integration',
                onTap: () => context.go('/parent/fees'),
              ),
            ],
          ),
        ),
      ),
    );
  }
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
  Widget build(BuildContext context) {
    return Card(
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
}
