import 'package:flutter/material.dart';

import '../data/student_demo_data.dart';
import '../models/student_portal_models.dart';
import '../student_design.dart';
import '../widgets/student_scaffold.dart';

class StudentFeesScreen extends StatelessWidget {
  const StudentFeesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final invoices = StudentDemoData.invoices;
    final current = invoices.first;
    return StudentScaffold(
      title: 'Fees & payment',
      selectedIndex: 2,
      body: ListView(
        padding: const EdgeInsets.all(StudentSpace.md),
        children: [
          Container(
            padding: const EdgeInsets.all(StudentSpace.lg),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [StudentColors.primaryDark, StudentColors.primary],
              ),
              borderRadius: BorderRadius.circular(StudentRadius.card),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const StudentStatusPill(
                  label: 'Blocked',
                  icon: Icons.lock_rounded,
                  color: StudentColors.accent,
                ),
                const SizedBox(height: StudentSpace.lg),
                Text(
                  'NPR ${current.netPayable.toStringAsFixed(0)}',
                  style: Theme.of(context)
                      .textTheme
                      .displaySmall
                      ?.copyWith(color: Colors.white),
                ),
                const SizedBox(height: StudentSpace.xs),
                Text(
                  'Outstanding for ${current.cycle} · Due ${_date(current.dueDate)}',
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(color: Colors.white70),
                ),
              ],
            ),
          ),
          const SizedBox(height: StudentSpace.lg),
          Text('Payment calendar',
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: StudentSpace.sm),
          SizedBox(
            height: 94,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: invoices.length,
              separatorBuilder: (_, __) =>
                  const SizedBox(width: StudentSpace.sm),
              itemBuilder: (context, index) {
                final invoice = invoices[index];
                return Container(
                  width: 142,
                  padding: const EdgeInsets.all(StudentSpace.sm),
                  decoration: BoxDecoration(
                    color: StudentColors.background,
                    border: Border.all(color: _stateColor(invoice.state)),
                    borderRadius: BorderRadius.circular(StudentRadius.card),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(invoice.cycle,
                          style: Theme.of(context).textTheme.titleMedium),
                      StudentStatusPill(
                        label: _stateLabel(invoice.state),
                        icon: _stateIcon(invoice.state),
                        color: _stateColor(invoice.state),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: StudentSpace.lg),
          Text('Current invoice',
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: StudentSpace.sm),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(StudentSpace.md),
              child: Column(
                children: [
                  for (final line in current.lines) ...[
                    Row(
                      children: [
                        Expanded(child: Text(line.label)),
                        Text(
                          '${line.amount < 0 ? '−' : ''}NPR ${line.amount.abs().toStringAsFixed(0)}',
                          style: TextStyle(
                            color: line.amount < 0
                                ? StudentColors.success
                                : StudentColors.text,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: StudentSpace.sm),
                  ],
                  const Divider(),
                  Row(
                    children: [
                      Expanded(
                        child: Text('Net payable',
                            style: Theme.of(context).textTheme.titleMedium),
                      ),
                      Text(
                        'NPR ${current.netPayable.toStringAsFixed(0)}',
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  color: StudentColors.primaryDark,
                                ),
                      ),
                    ],
                  ),
                  const SizedBox(height: StudentSpace.md),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        backgroundColor: StudentColors.accent,
                        foregroundColor: StudentColors.primaryDark,
                        shape: RoundedRectangleBorder(
                          borderRadius:
                              BorderRadius.circular(StudentRadius.control),
                        ),
                      ),
                      onPressed: () => _showQr(context, current),
                      icon: const Icon(Icons.qr_code_2_rounded),
                      label: const Text('Show Nepal Pay QR'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: StudentSpace.lg),
          Text('Invoice history',
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: StudentSpace.sm),
          for (final invoice in invoices.skip(1)) ...[
            Card(
              child: ListTile(
                minTileHeight: 72,
                title: Text(invoice.cycle),
                subtitle: Text('NPR ${invoice.netPayable.toStringAsFixed(0)}'),
                trailing: StudentStatusPill(
                  label: _stateLabel(invoice.state),
                  icon: _stateIcon(invoice.state),
                  color: _stateColor(invoice.state),
                ),
              ),
            ),
            const SizedBox(height: StudentSpace.sm),
          ],
        ],
      ),
    );
  }

  static void _showQr(BuildContext context, StudentInvoice invoice) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Nepal Pay', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: StudentSpace.xs),
            Text('Scan to pay NPR ${invoice.netPayable.toStringAsFixed(0)}'),
            const SizedBox(height: StudentSpace.lg),
            Container(
              width: 220,
              height: 220,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: StudentColors.border),
                borderRadius: BorderRadius.circular(StudentRadius.card),
              ),
              child: const Icon(
                Icons.qr_code_2_rounded,
                size: 190,
                color: StudentColors.text,
              ),
            ),
            const SizedBox(height: StudentSpace.md),
            Text(
              invoice.qrReference ?? 'QR unavailable',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: StudentSpace.xs),
            Text(
              'Verify the merchant and amount in your payment app before confirming.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

String _stateLabel(FeeDeadlineState state) => switch (state) {
      FeeDeadlineState.upcoming => 'Upcoming',
      FeeDeadlineState.dueSoon => 'Due soon',
      FeeDeadlineState.overdue => 'Overdue',
      FeeDeadlineState.paid => 'Paid',
    };

IconData _stateIcon(FeeDeadlineState state) => switch (state) {
      FeeDeadlineState.upcoming => Icons.schedule_rounded,
      FeeDeadlineState.dueSoon => Icons.notifications_active_outlined,
      FeeDeadlineState.overdue => Icons.error_rounded,
      FeeDeadlineState.paid => Icons.check_circle_rounded,
    };

Color _stateColor(FeeDeadlineState state) => switch (state) {
      FeeDeadlineState.upcoming => StudentColors.info,
      FeeDeadlineState.dueSoon => StudentColors.warning,
      FeeDeadlineState.overdue => StudentColors.error,
      FeeDeadlineState.paid => StudentColors.success,
    };

String _date(DateTime value) => '${value.day}/${value.month}/${value.year}';
