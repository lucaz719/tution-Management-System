import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:tms_mobile/core/theme/app_colors.dart';
import 'package:tms_mobile/shared/data/mock_portal_data.dart';
import 'package:tms_mobile/shared/widgets/kpi_card.dart';

class StudentHomeScreen extends StatelessWidget {
  const StudentHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final data = MockPortalData.student;
    final profile = data.profile;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Student Dashboard'),
        actions: [
          IconButton(
            tooltip: 'Logout',
            onPressed: () => context.go('/login'),
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
              Text(
                'Hello, ${profile.firstName}',
                style: Theme.of(context).textTheme.displaySmall,
              ),
              const SizedBox(height: 4),
              Text(
                '${profile.grade} • ${profile.branch} Branch',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: kColorText.withOpacity(0.74),
                    ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  const Expanded(
                    child: KpiCard(
                      title: 'Attendance',
                      value: '91%',
                      deltaText: 'This billing cycle',
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: KpiCard(
                      title: 'Outstanding',
                      value: 'NPR ${data.totalOutstanding.toStringAsFixed(0)}',
                      deltaText: '1 invoice open',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Text(
                'Academic Actions',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 12),
              _StudentActionTile(
                title: 'My Timetable',
                subtitle: 'Check class schedules, rooms, and teachers',
                icon: Icons.schedule_rounded,
                onTap: () => context.go('/student/timetable'),
              ),
              const SizedBox(height: 12),
              _StudentActionTile(
                title: 'Fees & Invoices',
                subtitle: 'View billing history and make cashless payments',
                icon: Icons.receipt_long_rounded,
                onTap: () => context.go('/student/fees'),
              ),
              const SizedBox(height: 12),
              _StudentActionTile(
                title: 'Digital Student ID',
                subtitle: 'Display your official student card and barcode',
                icon: Icons.badge_outlined,
                onTap: () => context.go('/student/id'),
              ),
              const SizedBox(height: 28),
              Text(
                'Announcements',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 12),
              for (final ann in data.announcements) ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          ann.title,
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${ann.branch} Branch • 2026-07-08',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _StudentActionTile extends StatelessWidget {
  const _StudentActionTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: kColorPrimary.withOpacity(0.08),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: kColorPrimary),
        ),
        title: Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(subtitle),
        ),
        trailing: const Icon(Icons.chevron_right_rounded),
        onTap: onTap,
      ),
    );
  }
}
