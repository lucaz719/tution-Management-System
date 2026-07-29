import 'package:flutter/material.dart';

import '../data/student_demo_data.dart';
import '../models/student_portal_models.dart';
import '../student_design.dart';
import '../widgets/student_scaffold.dart';

class StudentAttendanceScreen extends StatelessWidget {
  const StudentAttendanceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final records = StudentDemoData.attendance;
    final present =
        records.where((item) => item.mark == StudentAttendanceMark.present).length;
    final ratio = records.isEmpty ? 0.0 : present / records.length;
    return StudentScaffold(
      title: 'Attendance',
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
            child: Row(
              children: [
                SizedBox(
                  width: 76,
                  height: 76,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      CircularProgressIndicator(
                        value: ratio,
                        strokeWidth: 7,
                        color: StudentColors.accent,
                        backgroundColor: Colors.white24,
                      ),
                      Center(
                        child: Text(
                          '${(ratio * 100).round()}%',
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: StudentSpace.lg),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'This month',
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(color: Colors.white70),
                      ),
                      const SizedBox(height: StudentSpace.xs),
                      Text(
                        '$present present · ${records.length - present} other',
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: StudentSpace.lg),
          Text('Session record', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: StudentSpace.sm),
          for (final record in records) ...[
            Card(
              child: ListTile(
                minTileHeight: 72,
                leading: Icon(
                  _icon(record.mark),
                  color: _color(record.mark),
                ),
                title: Text(record.subject),
                subtitle: Text(
                  '${record.sessionAt.day}/${record.sessionAt.month}/${record.sessionAt.year}',
                ),
                trailing: StudentStatusPill(
                  label: _label(record.mark),
                  icon: _icon(record.mark),
                  color: _color(record.mark),
                ),
              ),
            ),
            const SizedBox(height: StudentSpace.sm),
          ],
          const SizedBox(height: StudentSpace.xs),
          Text(
            'Attendance is recorded by your teacher. Approved leave appears as Absent (Excused).',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }

  static String _label(StudentAttendanceMark mark) => switch (mark) {
        StudentAttendanceMark.present => 'Present',
        StudentAttendanceMark.absent => 'Absent',
        StudentAttendanceMark.excused => 'Absent (Excused)',
      };

  static IconData _icon(StudentAttendanceMark mark) => switch (mark) {
        StudentAttendanceMark.present => Icons.check_circle_rounded,
        StudentAttendanceMark.absent => Icons.cancel_rounded,
        StudentAttendanceMark.excused => Icons.event_available_rounded,
      };

  static Color _color(StudentAttendanceMark mark) => switch (mark) {
        StudentAttendanceMark.present => StudentColors.success,
        StudentAttendanceMark.absent => StudentColors.error,
        StudentAttendanceMark.excused => StudentColors.warning,
      };
}

