import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:tms_mobile/core/theme/app_theme.dart';
import 'package:tms_mobile/features/janitor/models/janitor_task.dart';
import 'package:tms_mobile/features/janitor/screens/janitor_home_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  GoogleFonts.config.allowRuntimeFetching = false;

  group('JanitorTask', () {
    test('moves through assigned, in progress, and completed states', () {
      final task = JanitorTask(
        id: 'task-1',
        title: 'Sanitize science lab',
        location: 'Science Block',
        dueAt: DateTime(2026, 9, 3, 10),
        priority: JanitorTaskPriority.high,
      );

      expect(task.nextStatus, JanitorTaskStatus.inProgress);
      expect(
        task.transitionTo(JanitorTaskStatus.inProgress).nextStatus,
        JanitorTaskStatus.completed,
      );
      expect(
        task
            .transitionTo(JanitorTaskStatus.inProgress)
            .transitionTo(JanitorTaskStatus.completed, completionNote: 'Done')
            .completionNote,
        'Done',
      );
    });
  });

  testWidgets('filters tasks and completes an assigned task from its detail',
      (tester) async {
    final today = DateTime.now();
    final assigned = JanitorTask(
      id: 'today-task',
      title: 'Clean reception desk',
      location: 'Main Building',
      dueAt: DateTime(today.year, today.month, today.day, 9),
      priority: JanitorTaskPriority.medium,
    );
    final upcoming = JanitorTask(
      id: 'upcoming-task',
      title: 'Restock washroom supplies',
      location: 'East Wing',
      dueAt: DateTime(today.year, today.month, today.day + 1, 10),
      priority: JanitorTaskPriority.low,
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: buildTmsTheme(),
        home: JanitorHomeScreen(initialTasks: [assigned, upcoming]),
      ),
    );

    expect(find.text('Clean reception desk'), findsOneWidget);
    expect(find.text('Restock washroom supplies'), findsNothing);

    await tester.tap(find.text('Upcoming'));
    await tester.pumpAndSettle();
    expect(find.text('Restock washroom supplies'), findsOneWidget);

    await tester.tap(find.text('Today'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Clean reception desk'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Start task'));
    await tester.pumpAndSettle();
    expect(find.text('Mark complete'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'Desk disinfected');
    await tester.tap(find.text('Mark complete'));
    await tester.pumpAndSettle();
    expect(find.text('Task completed'), findsOneWidget);

    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text('Completed'));
    await tester.pumpAndSettle();
    expect(find.text('Clean reception desk'), findsOneWidget);
    expect(find.text('Completed'), findsWidgets);
  });
}
