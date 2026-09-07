/// Janitor maintenance-task DTOs parsed from `GET /api/resources/my-tasks`.
///
/// Verified read-only against `services/api/src/routes/resources.ts`
/// (mounted at `/api/resources` in `services/api/src/server.ts`):
/// - `GET /my-tasks` — Janitor-role worker view; tasks assigned to the
///   authenticated identity. Identity comes from the Better Auth session
///   cookie; the client never sends user, tenant or branch ids.
/// - `POST /tasks/complete/:taskId` — resolves an assigned task.
///
/// Server status vocabulary is `PENDING | IN_PROGRESS | COMPLETED |
/// ESCALATED`. The client [JanitorTask] keeps the demo-era
/// assigned/inProgress/completed states; mapping is documented on
/// [JanitorMaintenanceTask.toTask].
///
/// Missing (no dedicated endpoint; TODO if the backend adds one):
/// - start/begin transition (`PENDING` -> `IN_PROGRESS`) — the client
///   performs the assigned -> in-progress step locally until the backend
///   exposes it.
/// - task priority — the server payload carries no priority; the client
///   derives a display-only priority (overdue/escalated -> high).
library;

import 'janitor_task.dart';

/// A single maintenance task as returned by `GET /api/resources/my-tasks`.
class JanitorMaintenanceTask {
  const JanitorMaintenanceTask({
    required this.id,
    required this.classroomId,
    required this.location,
    required this.description,
    required this.serverStatus,
    this.createdAt,
    this.dueAt,
    this.overdue = false,
    this.escalatedAt,
    this.completionTimestamp,
    this.completedByName,
  });

  final String id;
  final String classroomId;
  final String location;
  final String description;
  final String serverStatus;
  final DateTime? createdAt;
  final DateTime? dueAt;
  final bool overdue;
  final DateTime? escalatedAt;
  final DateTime? completionTimestamp;
  final String? completedByName;

  /// Client-side status derived from the server status.
  ///
  /// `PENDING` -> assigned, `IN_PROGRESS` -> inProgress,
  /// `COMPLETED` -> completed, `ESCALATED` -> assigned (surfaced as
  /// overdue/high-priority instead; the client has no escalated state).
  JanitorTaskStatus get clientStatus => switch (serverStatus) {
        'IN_PROGRESS' => JanitorTaskStatus.inProgress,
        'COMPLETED' => JanitorTaskStatus.completed,
        _ => JanitorTaskStatus.assigned,
      };

  /// Display-only priority: the server sends none, so overdue or escalated
  /// work reads high, everything else medium.
  JanitorTaskPriority get derivedPriority =>
      (overdue || serverStatus == 'ESCALATED')
          ? JanitorTaskPriority.high
          : JanitorTaskPriority.medium;

  /// Maps onto the UI model used by the janitor screens/widgets.
  JanitorTask toTask() {
    final due = dueAt ?? createdAt ?? DateTime.now();
    return JanitorTask(
      id: id,
      title: classroomId.isEmpty ? 'Maintenance task' : classroomId,
      location: location,
      dueAt: due,
      priority: derivedPriority,
      description: description,
      status: clientStatus,
      completionNote: completedByName != null && completedByName!.isNotEmpty
          ? 'Completed by $completedByName'
          : null,
    );
  }

  factory JanitorMaintenanceTask.fromJson(Map<String, dynamic> json) {
    final completedBy = json['completedBy'];
    return JanitorMaintenanceTask(
      id: _str(json['id']),
      classroomId: _str(json['classroomId']),
      location: _str(json['location']),
      description: _str(json['description']),
      serverStatus: _str(json['status']),
      createdAt: _date(json['createdAt']),
      dueAt: _date(json['dueAt']),
      overdue: json['overdue'] == true,
      escalatedAt: _date(json['escalatedAt']),
      completionTimestamp: _date(json['completionTimestamp']),
      completedByName: completedBy is Map<String, dynamic>
          ? completedBy['name'] as String?
          : null,
    );
  }
}

/// Task list envelope: `GET /api/resources/my-tasks` returns
/// `{ tasks: [...] }`.
class JanitorTaskList {
  const JanitorTaskList({this.tasks = const []});

  final List<JanitorMaintenanceTask> tasks;

  /// UI-ready tasks, newest due first.
  List<JanitorTask> toTasks() {
    final mapped = tasks.map((task) => task.toTask()).toList();
    mapped.sort((first, second) => first.dueAt.compareTo(second.dueAt));
    return mapped;
  }

  factory JanitorTaskList.fromJson(Map<String, dynamic> json) {
    final raw = json['tasks'];
    if (raw is! List) return const JanitorTaskList();
    return JanitorTaskList(
      tasks: [
        for (final item in raw)
          if (item is Map<String, dynamic>)
            JanitorMaintenanceTask.fromJson(item),
      ],
    );
  }
}

String _str(Object? value) => value is String ? value : '';

DateTime? _date(Object? value) {
  if (value is String && value.isNotEmpty) {
    return DateTime.tryParse(value);
  }
  return null;
}
