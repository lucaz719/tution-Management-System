import 'package:flutter/material.dart';
import 'package:tms_mobile/features/parent/widgets/child_switcher_bar.dart';
import 'package:tms_mobile/shared/models/app_models.dart';
import 'package:tms_mobile/shared/widgets/status_chip.dart';

class ParentAttendanceScreen extends StatefulWidget {
  const ParentAttendanceScreen({super.key});

  @override
  State<ParentAttendanceScreen> createState() => _ParentAttendanceScreenState();
}

class _ParentAttendanceScreenState extends State<ParentAttendanceScreen> {
  final _children = const ['Aarav', 'Mira'];
  late String _selectedChild;

  @override
  void initState() {
    super.initState();
    _selectedChild = _children.first;
  }

  @override
  Widget build(BuildContext context) {
    final records = [
      ('Mon', 'Present', 'On time arrival'),
      ('Tue', 'Present', 'Bus delay recorded'),
      ('Wed', 'Absent', 'Medical leave submitted'),
      ('Thu', 'Present', 'Full day attendance'),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Child Attendance')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            ChildSwitcherBar(
              childrenNames: _children,
              selectedChild: _selectedChild,
              onChanged: (child) => setState(() => _selectedChild = child),
            ),
            const SizedBox(height: 18),
            for (final record in records) ...[
              Card(
                child: ListTile(
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                  title: Text('${record.$1} • $_selectedChild'),
                  subtitle: Text(record.$3),
                  trailing: StatusChip(
                    label: record.$2,
                    variant: record.$2 == 'Absent'
                        ? StatusChipVariant.error
                        : StatusChipVariant.success,
                  ),
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
