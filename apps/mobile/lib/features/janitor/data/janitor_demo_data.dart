import '../models/janitor_task.dart';

class JanitorDemoData {
  const JanitorDemoData._();

  static List<JanitorTask> tasks({DateTime? now}) {
    final today = now ?? DateTime.now();
    DateTime at(int dayOffset, int hour, int minute) => DateTime(
          today.year,
          today.month,
          today.day + dayOffset,
          hour,
          minute,
        );

    return [
      JanitorTask(
        id: 'janitor-1',
        title: 'Sanitize science lab',
        location: 'Science Block · Lab 2',
        dueAt: at(0, 10, 0),
        priority: JanitorTaskPriority.high,
        description: 'Disinfect benches, sinks, and shared safety equipment.',
      ),
      JanitorTask(
        id: 'janitor-2',
        title: 'Restock washroom supplies',
        location: 'East Wing · Level 1',
        dueAt: at(0, 13, 30),
        priority: JanitorTaskPriority.medium,
        description: 'Top up soap, tissue, and hand-sanitizer dispensers.',
        status: JanitorTaskStatus.inProgress,
      ),
      JanitorTask(
        id: 'janitor-3',
        title: 'Clean reception desk',
        location: 'Main Building · Reception',
        dueAt: at(1, 8, 30),
        priority: JanitorTaskPriority.low,
        description: 'Wipe the counter, visitor chairs, and glass partition.',
      ),
      JanitorTask(
        id: 'janitor-4',
        title: 'Mop library corridor',
        location: 'Library · Ground floor',
        dueAt: at(-1, 16, 0),
        priority: JanitorTaskPriority.medium,
        description: 'Complete the wet-floor safety check after mopping.',
        status: JanitorTaskStatus.completed,
        completionNote: 'Completed and wet-floor signs removed after drying.',
      ),
    ];
  }
}
