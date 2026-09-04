import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tms_mobile/core/providers/auth_provider.dart';
import 'package:tms_mobile/core/theme/app_colors.dart';

import '../data/janitor_demo_data.dart';
import '../models/janitor_task.dart';
import '../widgets/janitor_task_card.dart';
import 'janitor_task_detail_screen.dart';

enum JanitorTaskFilter { today, upcoming, completed }

extension JanitorTaskFilterLabel on JanitorTaskFilter {
  String get label => switch (this) {
        JanitorTaskFilter.today => 'Today',
        JanitorTaskFilter.upcoming => 'Upcoming',
        JanitorTaskFilter.completed => 'Completed',
      };
}

class JanitorHomeScreen extends ConsumerStatefulWidget {
  const JanitorHomeScreen({super.key, this.initialTasks});

  final List<JanitorTask>? initialTasks;

  @override
  ConsumerState<JanitorHomeScreen> createState() => _JanitorHomeScreenState();
}

class _JanitorHomeScreenState extends ConsumerState<JanitorHomeScreen> {
  late List<JanitorTask> _tasks;
  JanitorTaskFilter _filter = JanitorTaskFilter.today;

  @override
  void initState() {
    super.initState();
    _tasks = List.of(widget.initialTasks ?? JanitorDemoData.tasks());
  }

  List<JanitorTask> get _filteredTasks {
    final now = DateTime.now();
    final tasks = switch (_filter) {
      JanitorTaskFilter.today =>
        _tasks.where((task) => !task.isCompleted && task.isDueOn(now)).toList(),
      JanitorTaskFilter.upcoming => _tasks
          .where((task) =>
              !task.isCompleted &&
              task.dueAt.isAfter(DateTime(now.year, now.month, now.day + 1)))
          .toList(),
      JanitorTaskFilter.completed =>
        _tasks.where((task) => task.isCompleted).toList(),
    };
    tasks.sort((first, second) => first.dueAt.compareTo(second.dueAt));
    return tasks;
  }

  void _updateTask(JanitorTask updatedTask) {
    setState(() {
      _tasks = _tasks
          .map((task) => task.id == updatedTask.id ? updatedTask : task)
          .toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 700;
    final activeCount = _tasks.where((task) => !task.isCompleted).length;
    final tasks = _filteredTasks;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My tasks'),
        actions: [
          IconButton(
            tooltip: 'Change password',
            icon: const Icon(Icons.key_rounded),
            onPressed: () => context.push('/janitor/change-password'),
          ),
          IconButton(
            tooltip: 'Log out',
            icon: const Icon(Icons.logout_rounded),
            onPressed: () => ref.read(authProvider.notifier).logout(),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(child: Text('$activeCount active')),
          ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 900),
            child: ListView(
              padding:
                  EdgeInsets.fromLTRB(wide ? 32 : 16, 16, wide ? 32 : 16, 28),
              children: [
                _WelcomeCard(activeCount: activeCount),
                const SizedBox(height: 24),
                Text('Assigned work',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: SegmentedButton<JanitorTaskFilter>(
                    segments: [
                      for (final filter in JanitorTaskFilter.values)
                        ButtonSegment(value: filter, label: Text(filter.label)),
                    ],
                    selected: {_filter},
                    onSelectionChanged: (selected) =>
                        setState(() => _filter = selected.first),
                  ),
                ),
                const SizedBox(height: 16),
                if (tasks.isEmpty)
                  const _EmptyTaskList()
                else
                  for (final task in tasks) ...[
                    JanitorTaskCard(
                      task: task,
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => JanitorTaskDetailScreen(
                            task: task,
                            onTaskUpdated: _updateTask,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _WelcomeCard extends StatelessWidget {
  const _WelcomeCard({required this.activeCount});

  final int activeCount;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: kColorPrimary,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Good morning',
              style: Theme.of(context)
                  .textTheme
                  .headlineMedium
                  ?.copyWith(color: Colors.white),
            ),
            const SizedBox(height: 8),
            Text(
              '$activeCount tasks need your attention.',
              style: Theme.of(context)
                  .textTheme
                  .bodyLarge
                  ?.copyWith(color: Colors.white70),
            ),
          ],
        ),
      );
}

class _EmptyTaskList extends StatelessWidget {
  const _EmptyTaskList();

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 56),
        child: Column(
          children: [
            const Icon(Icons.task_alt_rounded, size: 48, color: kColorSuccess),
            const SizedBox(height: 12),
            Text('No tasks here',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            const Text('You are all caught up for this view.'),
          ],
        ),
      );
}
