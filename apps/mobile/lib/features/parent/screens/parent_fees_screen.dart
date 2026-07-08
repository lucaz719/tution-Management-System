import 'package:flutter/material.dart';
import 'package:tms_mobile/features/parent/widgets/child_switcher_bar.dart';
import 'package:tms_mobile/shared/models/app_models.dart';
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
    final statements = [
      ('Tuition • July', 'NPR 3,000', 'Pending'),
      ('Transport • July', 'NPR 1,500', 'Pending'),
      ('Library • June', 'NPR 500', 'Paid'),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Child Fees')),
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
            Card(
              child: ListTile(
                contentPadding: const EdgeInsets.all(18),
                title: Text('Outstanding for $_selectedChild'),
                subtitle: const Text(
                    'Payment gateway integration is a future phase.'),
                trailing: Text(
                  'NPR 4,500',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
            ),
            const SizedBox(height: 18),
            for (final statement in statements) ...[
              Card(
                child: ListTile(
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                  title: Text(statement.$1),
                  subtitle: Text(statement.$2),
                  trailing: StatusChip(
                    label: statement.$3,
                    variant: statement.$3 == 'Paid'
                        ? StatusChipVariant.success
                        : StatusChipVariant.warning,
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
