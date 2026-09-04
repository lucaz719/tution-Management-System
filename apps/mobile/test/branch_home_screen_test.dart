import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tms_mobile/features/branch_manager/screens/branch_home_screen.dart';

void main() {
  testWidgets('Branch Manager dashboard shows branch operations',
      (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: BranchHomeScreen()),
      ),
    );

    expect(find.text('Branch Manager'), findsOneWidget);
    expect(find.text('Baneshwor Branch'), findsOneWidget);
    expect(find.text('Operations'), findsOneWidget);
    expect(find.byIcon(Icons.approval_outlined), findsWidgets);
  });
}
