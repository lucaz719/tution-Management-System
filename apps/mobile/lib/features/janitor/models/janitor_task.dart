enum JanitorTaskStatus { assigned, inProgress, completed }

enum JanitorTaskPriority { low, medium, high }

extension JanitorTaskStatusLabel on JanitorTaskStatus {
  String get label => switch (this) {
        JanitorTaskStatus.assigned => 'Assigned',
        JanitorTaskStatus.inProgress => 'In progress',
        JanitorTaskStatus.completed => 'Completed',
      };
}

extension JanitorTaskPriorityLabel on JanitorTaskPriority {
  String get label => switch (this) {
        JanitorTaskPriority.low => 'Low',
        JanitorTaskPriority.medium => 'Medium',
        JanitorTaskPriority.high => 'High',
      };
}

class JanitorTask {
  const JanitorTask({
    required this.id,
    required this.title,
    required this.location,
    required this.dueAt,
    required this.priority,
    this.description = '',
    this.status = JanitorTaskStatus.assigned,
    this.completionNote,
  });

  final String id;
  final String title;
  final String location;
  final DateTime dueAt;
  final JanitorTaskPriority priority;
  final String description;
  final JanitorTaskStatus status;
  final String? completionNote;

  JanitorTaskStatus? get nextStatus => switch (status) {
        JanitorTaskStatus.assigned => JanitorTaskStatus.inProgress,
        JanitorTaskStatus.inProgress => JanitorTaskStatus.completed,
        JanitorTaskStatus.completed => null,
      };

  bool get isCompleted => status == JanitorTaskStatus.completed;

  bool isDueOn(DateTime day) =>
      dueAt.year == day.year &&
      dueAt.month == day.month &&
      dueAt.day == day.day;

  JanitorTask transitionTo(
    JanitorTaskStatus next, {
    String? completionNote,
  }) {
    if (next != nextStatus) {
      throw StateError('Cannot move ${status.label} task to ${next.label}.');
    }

    return copyWith(
      status: next,
      completionNote: next == JanitorTaskStatus.completed
          ? completionNote
          : this.completionNote,
    );
  }

  JanitorTask copyWith({
    JanitorTaskStatus? status,
    String? completionNote,
  }) {
    return JanitorTask(
      id: id,
      title: title,
      location: location,
      dueAt: dueAt,
      priority: priority,
      description: description,
      status: status ?? this.status,
      completionNote: completionNote ?? this.completionNote,
    );
  }
}
