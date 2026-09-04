import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tms_mobile/features/tenant_admin/screens/tenant_admin_home_screen.dart';

void main() {
  testWidgets('renders tenant operations dashboard content at compact width',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: TenantAdminHomeScreen()),
    );

    expect(find.text('Tenant operations'), findsOneWidget);
    expect(find.text('Active branches'), findsOneWidget);
    expect(find.text('Staff'), findsOneWidget);
    expect(find.text('Students'), findsOneWidget);
    expect(find.text('Pending L2 approvals'), findsOneWidget);
    expect(find.text('Branch overview'), findsOneWidget);
    expect(find.bySemanticsLabel('Open People'), findsOneWidget);
    expect(find.bySemanticsLabel('Open Reports'), findsOneWidget);
    expect(find.bySemanticsLabel('Open Approvals'), findsOneWidget);
  });
}
