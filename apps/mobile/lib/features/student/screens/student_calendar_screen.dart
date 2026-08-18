import 'package:flutter/material.dart';

import '../data/student_demo_data.dart';
import '../models/student_portal_models.dart';
import '../student_design.dart';
import '../widgets/student_scaffold.dart';

class StudentCalendarScreen extends StatelessWidget {
  const StudentCalendarScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final events = [...StudentDemoData.events]
      ..sort((a, b) => a.date.compareTo(b.date));
    return StudentScaffold(
      title: 'Academic calendar',
      selectedIndex: 3,
      body: ListView(
        padding: const EdgeInsets.all(StudentSpace.md),
        children: [
          Wrap(
            spacing: StudentSpace.xs,
            runSpacing: StudentSpace.xs,
            children: AcademicEventType.values
                .map(
                  (type) => StudentStatusPill(
                    label: _typeLabel(type),
                    icon: _typeIcon(type),
                    color: _typeColor(type),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: StudentSpace.lg),
          Text('Upcoming events',
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: StudentSpace.sm),
          for (final event in events) ...[
            Card(
              child: InkWell(
                borderRadius: BorderRadius.circular(StudentRadius.card),
                onTap: () => showModalBottomSheet<void>(
                  context: context,
                  showDragHandle: true,
                  builder: (context) => Padding(
                    padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        StudentStatusPill(
                          label: _typeLabel(event.type),
                          icon: _typeIcon(event.type),
                          color: _typeColor(event.type),
                        ),
                        const SizedBox(height: StudentSpace.md),
                        Text(event.title,
                            style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: StudentSpace.xs),
                        Text(_date(event.date)),
                        const SizedBox(height: StudentSpace.md),
                        Text(event.details),
                      ],
                    ),
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(StudentSpace.md),
                  child: Row(
                    children: [
                      Container(
                        width: 52,
                        height: 58,
                        decoration: BoxDecoration(
                          color: _typeColor(event.type).withValues(alpha: .10),
                          borderRadius:
                              BorderRadius.circular(StudentRadius.control),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              '${event.date.day}',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(color: _typeColor(event.type)),
                            ),
                            Text(
                              _month(event.date.month),
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(color: _typeColor(event.type)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: StudentSpace.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(event.title,
                                style: Theme.of(context).textTheme.titleMedium),
                            const SizedBox(height: StudentSpace.xxs),
                            Text(
                              event.details,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: StudentSpace.sm),
          ],
        ],
      ),
    );
  }

  static String _typeLabel(AcademicEventType type) => switch (type) {
        AcademicEventType.holiday => 'Holiday',
        AcademicEventType.exam => 'Exam',
        AcademicEventType.ceremony => 'Ceremony',
        AcademicEventType.feeDue => 'Fee due',
      };

  static IconData _typeIcon(AcademicEventType type) => switch (type) {
        AcademicEventType.holiday => Icons.celebration_outlined,
        AcademicEventType.exam => Icons.edit_note_rounded,
        AcademicEventType.ceremony => Icons.emoji_events_outlined,
        AcademicEventType.feeDue => Icons.receipt_long_outlined,
      };

  static Color _typeColor(AcademicEventType type) => switch (type) {
        AcademicEventType.holiday => StudentColors.success,
        AcademicEventType.exam => StudentColors.error,
        AcademicEventType.ceremony => StudentColors.primary,
        AcademicEventType.feeDue => StudentColors.warning,
      };
}

String _date(DateTime value) => '${value.day}/${value.month}/${value.year}';
String _month(int value) => const [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ][value - 1];
