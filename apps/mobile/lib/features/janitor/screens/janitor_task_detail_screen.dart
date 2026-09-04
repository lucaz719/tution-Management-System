import 'package:flutter/material.dart';
import 'package:tms_mobile/core/theme/app_colors.dart';

import '../models/janitor_task.dart';
import '../widgets/janitor_task_card.dart';

class JanitorTaskDetailScreen extends StatefulWidget {
  const JanitorTaskDetailScreen({
    super.key,
    required this.task,
    this.onTaskUpdated,
  });

  final JanitorTask task;
  final ValueChanged<JanitorTask>? onTaskUpdated;

  @override
  State<JanitorTaskDetailScreen> createState() =>
      _JanitorTaskDetailScreenState();
}

class _JanitorTaskDetailScreenState extends State<JanitorTaskDetailScreen> {
  late JanitorTask _task;
  final _completionNoteController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _task = widget.task;
    _completionNoteController.text = _task.completionNote ?? '';
  }

  @override
  void dispose() {
    _completionNoteController.dispose();
    super.dispose();
  }

  void _advanceTask() {
    final nextStatus = _task.nextStatus;
    if (nextStatus == null) return;

    final updated = _task.transitionTo(
      nextStatus,
      completionNote: _completionNoteController.text.trim(),
    );
    setState(() => _task = updated);
    widget.onTaskUpdated?.call(updated);
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 700;
    return Scaffold(
      appBar: AppBar(title: const Text('Task details')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: ListView(
              padding: EdgeInsets.all(wide ? 32 : 20),
              children: [
                Text(_task.title,
                    style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 8),
                Text(_task.location,
                    style: Theme.of(context).textTheme.bodyLarge),
                const SizedBox(height: 20),
                JanitorTaskCard(task: _task, onTap: () {}),
                const SizedBox(height: 24),
                Text('Instructions',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                Text(
                  _task.description.isEmpty
                      ? 'Complete this task following the site cleaning procedure.'
                      : _task.description,
                ),
                const SizedBox(height: 24),
                if (_task.status == JanitorTaskStatus.inProgress) ...[
                  Text('Completion note',
                      style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _completionNoteController,
                    minLines: 3,
                    maxLines: 5,
                    textInputAction: TextInputAction.done,
                    decoration: const InputDecoration(
                      labelText: 'Completion note (optional)',
                      hintText:
                          'Add supplies used, issues found, or a handoff note.',
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
                if (_task.status == JanitorTaskStatus.completed) ...[
                  _CompletedBanner(note: _task.completionNote),
                  const SizedBox(height: 24),
                ],
                if (_task.nextStatus != null)
                  ElevatedButton.icon(
                    onPressed: _advanceTask,
                    icon: Icon(_task.status == JanitorTaskStatus.assigned
                        ? Icons.play_arrow_rounded
                        : Icons.check_rounded),
                    label: Text(_task.status == JanitorTaskStatus.assigned
                        ? 'Start task'
                        : 'Mark complete'),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CompletedBanner extends StatelessWidget {
  const _CompletedBanner({this.note});

  final String? note;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: kColorSuccess.withValues(alpha: .1),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: kColorSuccess),
                const SizedBox(width: 8),
                Text(
                  'Task completed',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: kColorSuccess,
                      ),
                ),
              ],
            ),
            if (note != null && note!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(note!),
            ],
          ],
        ),
      );
}
