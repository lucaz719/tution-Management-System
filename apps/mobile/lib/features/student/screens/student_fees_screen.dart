import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:tms_mobile/core/theme/app_colors.dart';
import 'package:tms_mobile/shared/data/mock_portal_data.dart';
import 'package:tms_mobile/shared/widgets/nepal_pay_qr_sheet.dart';
import 'package:tms_mobile/shared/widgets/status_chip.dart';
import 'package:tms_mobile/shared/models/app_models.dart';

class StudentFeesScreen extends StatelessWidget {
  const StudentFeesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final data = MockPortalData.student;
    final invoices = data.invoices;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Fees & Billing'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.go('/student/home'),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Card(
              color: kColorPrimary,
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Total Outstanding',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: Colors.white.withOpacity(0.85),
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'NPR ${data.totalOutstanding.toStringAsFixed(0)}',
                      style: Theme.of(context).textTheme.displayLarge?.copyWith(
                            color: Colors.white,
                          ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      data.totalOutstanding > 0
                          ? 'Please settle your outstanding bills to avoid account blocking.'
                          : 'Your account is fully paid. Thank you!',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.white.withOpacity(0.74),
                          ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Invoice History',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            if (invoices.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: Text('No invoice history found.'),
                ),
              ),
            for (final invoice in invoices) ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            invoice.monthLabel,
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                          StatusChip(
                            label: invoice.status.label,
                            variant: invoice.status.chipVariant,
                          ),
                        ],
                      ),
                      const Divider(height: 24),
                      for (final item in invoice.breakdown) ...[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              item.label,
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: kColorText.withOpacity(0.7),
                                  ),
                            ),
                            Text(
                              'NPR ${item.amount.toStringAsFixed(0)}',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                      ],
                      const Divider(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Total Amount',
                            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                          Text(
                            'NPR ${invoice.amount.toStringAsFixed(0)}',
                            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: kColorPrimary,
                                ),
                          ),
                        ],
                      ),
                      if (invoice.status != InvoiceStatus.paid) ...[
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: kColorAccent,
                              minimumSize: const Size.fromHeight(48),
                            ),
                            onPressed: () => showNepalPayQrSheet(
                              context,
                              title: 'Invoice for ${invoice.monthLabel}',
                              amount: invoice.amount,
                            ),
                            icon: const Icon(Icons.qr_code_rounded),
                            label: const Text('Pay with Nepal Pay'),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ],
        ),
      ),
    );
  }
}
