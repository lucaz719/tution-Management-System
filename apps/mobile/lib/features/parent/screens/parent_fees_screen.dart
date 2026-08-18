import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:tms_mobile/core/theme/app_colors.dart';
import 'package:tms_mobile/features/parent/widgets/child_switcher_bar.dart';
import 'package:tms_mobile/shared/models/app_models.dart';
import 'package:tms_mobile/shared/widgets/nepal_pay_qr_sheet.dart';
import 'package:tms_mobile/shared/widgets/status_chip.dart';

class ParentFeesScreen extends StatefulWidget {
  const ParentFeesScreen({super.key});

  @override
  State<ParentFeesScreen> createState() => _ParentFeesScreenState();
}

class _ParentFeesScreenState extends State<ParentFeesScreen> {
  final _children = const ['Aarav', 'Mira'];
  late String _selectedChild;

  @override
  void initState() {
    super.initState();
    _selectedChild = _children.first;
  }

  @override
  Widget build(BuildContext context) {
    final isAarav = _selectedChild == 'Aarav';
    final totalOutstanding = isAarav ? 'NPR 4,500' : 'NPR 0';
    final hasDue = isAarav;

    final statements = isAarav
        ? [
            (
              month: 'Tuition Fee • July 2026',
              amount: 'NPR 3,000',
              dueDate: '25 July 2026',
              status: 'Pending',
              breakdown: [
                ('Monthly Tuition', 'NPR 2,800'),
                ('Lab & Material Fee', 'NPR 200')
              ],
            ),
            (
              month: 'Transport Fee • July 2026',
              amount: 'NPR 1,500',
              dueDate: '25 July 2026',
              status: 'Pending',
              breakdown: [('Route 4 Pickup', 'NPR 1,500')],
            ),
            (
              month: 'Tuition & Library • June 2026',
              amount: 'NPR 3,500',
              dueDate: '25 June 2026',
              status: 'Paid',
              breakdown: [
                ('Monthly Tuition', 'NPR 3,000'),
                ('Library Membership', 'NPR 500')
              ],
            ),
          ]
        : [
            (
              month: 'Tuition Fee • July 2026',
              amount: 'NPR 3,200',
              dueDate: '25 July 2026',
              status: 'Paid',
              breakdown: [('Grade 8 Advanced Course', 'NPR 3,200')],
            ),
            (
              month: 'Tuition Fee • June 2026',
              amount: 'NPR 3,200',
              dueDate: '25 June 2026',
              status: 'Paid',
              breakdown: [('Grade 8 Advanced Course', 'NPR 3,200')],
            ),
          ];

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Child Fee Portal',
          style:
              GoogleFonts.fraunces(fontWeight: FontWeight.w700, fontSize: 22),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            ChildSwitcherBar(
              childrenNames: _children,
              selectedChild: _selectedChild,
              onChanged: (child) => setState(() => _selectedChild = child),
            ),
            const SizedBox(height: 20),

            // Outstanding Balance Card
            Card(
              color: hasDue ? kColorPrimary : kColorSuccess,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Outstanding Balance',
                          style: GoogleFonts.outfit(
                            color: Colors.white.withValues(alpha: 0.85),
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            _selectedChild,
                            style: GoogleFonts.outfit(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      totalOutstanding,
                      style: GoogleFonts.fraunces(
                        color: Colors.white,
                        fontSize: 32,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (hasDue) ...[
                      ElevatedButton.icon(
                        onPressed: () {
                          showNepalPayQrSheet(
                            context,
                            title: 'July 2026 Tuition',
                            amount: 4500.0,
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: kColorAccent,
                          foregroundColor: Colors.white,
                          minimumSize: const Size.fromHeight(48),
                        ),
                        icon: const Icon(Icons.qr_code_scanner_rounded),
                        label: const Text('Pay via NepalPay QR'),
                      )
                    ] else ...[
                      Row(
                        children: [
                          const Icon(Icons.check_circle_rounded,
                              color: Colors.white, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'All dues cleared for $_selectedChild!',
                            style: GoogleFonts.outfit(
                                color: Colors.white,
                                fontWeight: FontWeight.w600),
                          ),
                        ],
                      )
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            Text(
              'Fee Statements & Invoices',
              style: GoogleFonts.fraunces(
                  fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),

            for (final stmt in statements) ...[
              Card(
                child: ExpansionTile(
                  tilePadding:
                      const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                  childrenPadding: const EdgeInsets.fromLTRB(18, 0, 18, 16),
                  title: Text(
                    stmt.month,
                    style: Theme.of(context)
                        .textTheme
                        .titleSmall
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text('Due Date: ${stmt.dueDate} • ${stmt.amount}'),
                  ),
                  trailing: StatusChip(
                    label: stmt.status,
                    variant: stmt.status == 'Paid'
                        ? StatusChipVariant.success
                        : StatusChipVariant.warning,
                  ),
                  children: [
                    const Divider(),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Text(
                          'Breakdown Details',
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    for (final item in stmt.breakdown) ...[
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(item.$1,
                                style: Theme.of(context).textTheme.bodySmall),
                            Text(item.$2,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                    ],
                    if (stmt.status != 'Paid') ...[
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: () {
                          showNepalPayQrSheet(
                            context,
                            title: stmt.month,
                            amount: 3000.0,
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(40),
                        ),
                        icon: const Icon(Icons.qr_code_2_rounded, size: 18),
                        label: const Text('Pay This Invoice'),
                      ),
                    ]
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
          ],
        ),
      ),
    );
  }
}
