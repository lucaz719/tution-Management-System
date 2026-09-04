import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:tms_mobile/core/providers/child_selection_provider.dart';
import 'package:tms_mobile/core/theme/app_colors.dart';
import 'package:tms_mobile/features/parent/widgets/child_switcher_bar.dart';
import 'package:tms_mobile/shared/models/app_models.dart';
import 'package:tms_mobile/shared/widgets/progress_ring.dart';
import 'package:tms_mobile/shared/widgets/status_chip.dart';

class ParentAttendanceScreen extends ConsumerStatefulWidget {
  const ParentAttendanceScreen({super.key});

  @override
  ConsumerState<ParentAttendanceScreen> createState() => _ParentAttendanceScreenState();
}

class _ParentAttendanceScreenState extends ConsumerState<ParentAttendanceScreen> {
  AttendanceViewMode _viewMode = AttendanceViewMode.list;

  @override
  Widget build(BuildContext context) {
    final selectedChild = ref.watch(childSelectionProvider);
    final isAarav = selectedChild == 'Aarav';
    final attendanceRate = isAarav ? 0.92 : 0.96;
    final presentDays = isAarav ? 23 : 24;
    final absentDays = isAarav ? 2 : 1;
    final excusedDays = isAarav ? 1 : 0;

    final records = isAarav
        ? [
            (
              'Fri, Jul 18',
              'Present',
              'On-time arrival (08:45 AM)',
              AttendanceStatus.present
            ),
            (
              'Thu, Jul 17',
              'Present',
              'On-time arrival (08:50 AM)',
              AttendanceStatus.present
            ),
            (
              'Wed, Jul 16',
              'Absent',
              'Medical leave submitted & verified',
              AttendanceStatus.absent
            ),
            (
              'Tue, Jul 15',
              'Present',
              'On-time arrival (08:42 AM)',
              AttendanceStatus.present
            ),
            (
              'Mon, Jul 14',
              'Excused',
              'Approved family event leave',
              AttendanceStatus.excused
            ),
            (
              'Fri, Jul 11',
              'Present',
              'Bus delay recorded (+10 min)',
              AttendanceStatus.present
            ),
          ]
        : [
            (
              'Fri, Jul 18',
              'Present',
              'On-time arrival (08:40 AM)',
              AttendanceStatus.present
            ),
            (
              'Thu, Jul 17',
              'Present',
              'On-time arrival (08:44 AM)',
              AttendanceStatus.present
            ),
            (
              'Wed, Jul 16',
              'Present',
              'On-time arrival (08:48 AM)',
              AttendanceStatus.present
            ),
            (
              'Tue, Jul 15',
              'Absent',
              'Sick leave - Doctor note provided',
              AttendanceStatus.absent
            ),
            (
              'Mon, Jul 14',
              'Present',
              'On-time arrival (08:41 AM)',
              AttendanceStatus.present
            ),
          ];

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
          tooltip: 'Back',
        ),
        title: Text(
          'Child Attendance',
          style:
              GoogleFonts.fraunces(fontWeight: FontWeight.w700, fontSize: 22),
        ),
        actions: [
          IconButton(
            icon: Icon(_viewMode == AttendanceViewMode.list
                ? Icons.calendar_month_rounded
                : Icons.format_list_bulleted_rounded),
            tooltip: _viewMode == AttendanceViewMode.list
                ? 'Calendar View'
                : 'List View',
            onPressed: () {
              setState(() {
                _viewMode = _viewMode == AttendanceViewMode.list
                    ? AttendanceViewMode.calendar
                    : AttendanceViewMode.list;
              });
            },
          )
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const ChildSwitcherBar(),
            const SizedBox(height: 20),

            // Summary Card with ProgressRing
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    ProgressRing(
                      percent: attendanceRate,
                      size: 84,
                      strokeWidth: 8,
                      color:
                          attendanceRate >= 0.9 ? kColorSuccess : kColorWarning,
                    ),
                    const SizedBox(width: 20),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$selectedChild\'s Rate',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Monthly Attendance Summary',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              _StatBadge(
                                  label: 'Present',
                                  count: '$presentDays d',
                                  color: kColorSuccess),
                              _StatBadge(
                                  label: 'Absent',
                                  count: '$absentDays d',
                                  color: kColorError),
                              _StatBadge(
                                  label: 'Excused',
                                  count: '$excusedDays d',
                                  color: kColorWarning),
                            ],
                          )
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Recent Activity Log',
                  style: GoogleFonts.fraunces(
                      fontSize: 18, fontWeight: FontWeight.w700),
                ),
                Text(
                  'July 2026',
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
              ],
            ),
            const SizedBox(height: 12),

            if (_viewMode == AttendanceViewMode.list) ...[
              for (final record in records) ...[
                Card(
                  child: ListTile(
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                    leading: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: record.$4.chipVariant ==
                                StatusChipVariant.success
                            ? kColorSuccess.withValues(alpha: 0.12)
                            : record.$4.chipVariant == StatusChipVariant.error
                                ? kColorError.withValues(alpha: 0.12)
                                : kColorWarning.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        record.$4.icon,
                        color: record.$4.chipVariant ==
                                StatusChipVariant.success
                            ? kColorSuccess
                            : record.$4.chipVariant == StatusChipVariant.error
                                ? kColorError
                                : kColorWarning,
                        size: 20,
                      ),
                    ),
                    title: Text(
                      record.$1,
                      style: Theme.of(context)
                          .textTheme
                          .titleSmall
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text(record.$3),
                    trailing: StatusChip(
                      label: record.$2,
                      variant: record.$4.chipVariant,
                    ),
                  ),
                ),
                const SizedBox(height: 10),
              ],
            ] else ...[
              // Grid Calendar Mock view
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      Text(
                        'Monthly Overview Grid',
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      const SizedBox(height: 14),
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 7,
                          mainAxisSpacing: 8,
                          crossAxisSpacing: 8,
                        ),
                        itemCount: 31,
                        itemBuilder: (context, index) {
                          final day = index + 1;
                          final isWeekend = (day % 7 == 6 || day % 7 == 0);
                          final isAbs = day == 16;
                          final isExc = day == 14;

                          Color bgColor = kColorSuccess.withValues(alpha: 0.15);
                          Color textColor = kColorSuccess;
                          if (isWeekend) {
                            bgColor = kColorSurface;
                            textColor = kColorText.withValues(alpha: 0.4);
                          } else if (isAbs) {
                            bgColor = kColorError.withValues(alpha: 0.15);
                            textColor = kColorError;
                          } else if (isExc) {
                            bgColor = kColorWarning.withValues(alpha: 0.15);
                            textColor = kColorWarning;
                          }

                          return Container(
                            decoration: BoxDecoration(
                              color: bgColor,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Center(
                              child: Text(
                                '$day',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: textColor,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatBadge extends StatelessWidget {
  const _StatBadge(
      {required this.label, required this.count, required this.color});
  final String label;
  final String count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          count,
          style: GoogleFonts.outfit(
              fontWeight: FontWeight.w700, fontSize: 15, color: color),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 11),
        ),
      ],
    );
  }
}
