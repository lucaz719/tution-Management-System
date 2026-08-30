import 'package:flutter/material.dart';
import '../data/student_demo_data.dart';
import '../models/student_portal_models.dart';
import '../student_design.dart';
import '../widgets/student_scaffold.dart';

class StudentAcademicsScreen extends StatefulWidget {
  const StudentAcademicsScreen({super.key});

  @override
  State<StudentAcademicsScreen> createState() => _StudentAcademicsScreenState();
}

class _StudentAcademicsScreenState extends State<StudentAcademicsScreen> {
  int _segment = 0;

  @override
  Widget build(BuildContext context) {
    return StudentScaffold(
      title: 'My academics',
      selectedIndex: 1,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: SizedBox(
              width: double.infinity,
              child: SegmentedButton<int>(
                showSelectedIcon: false,
                segments: const [
                  ButtonSegment(value: 0, label: Text('Results')),
                  ButtonSegment(value: 1, label: Text('Syllabus')),
                  ButtonSegment(value: 2, label: Text('Homework')),
                  ButtonSegment(value: 3, label: Text('Analytics')),
                ],
                selected: {_segment},
                onSelectionChanged: (selection) =>
                    setState(() => _segment = selection.first),
              ),
            ),
          ),
          Expanded(
            child: IndexedStack(
              index: _segment,
              children: const [
                _ResultsView(),
                _SyllabusView(),
                _HomeworkView(),
                _InsightsView(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ResultsView extends StatelessWidget {
  const _ResultsView();

  @override
  Widget build(BuildContext context) {
    final results = StudentDemoData.results;
    return RefreshIndicator(
      onRefresh: () async => Future<void>.delayed(
        const Duration(milliseconds: 350),
      ),
      child: ListView(
        padding: const EdgeInsets.all(StudentSpace.md),
        children: [
          Container(
            padding: const EdgeInsets.all(StudentSpace.md),
            decoration: BoxDecoration(
              color: StudentColors.primary.withValues(alpha: .08),
              borderRadius: BorderRadius.circular(StudentRadius.card),
            ),
            child: const Row(
              children: [
                Icon(Icons.bolt_rounded, color: StudentColors.primary),
                SizedBox(width: StudentSpace.sm),
                Expanded(
                  child: Text(
                    'Scores appear here as soon as your teacher publishes them.',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: StudentSpace.lg),
          Text('Latest results', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: StudentSpace.sm),
          for (final result in results) ...[
            _ResultCard(result: result),
            const SizedBox(height: StudentSpace.sm),
          ],
        ],
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.result});
  final TestResult result;

  @override
  Widget build(BuildContext context) {
    final aboveAverage =
        result.percentage >= result.classAverage / result.maximum * 100;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(StudentSpace.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(result.subject,
                          style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: StudentSpace.xxs),
                      Text(result.testName,
                          style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                ),
                Text(
                  '${result.score.toStringAsFixed(0)}/${result.maximum.toStringAsFixed(0)}',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: StudentColors.primaryDark,
                      ),
                ),
              ],
            ),
            const SizedBox(height: StudentSpace.md),
            ClipRRect(
              borderRadius: BorderRadius.circular(StudentRadius.pill),
              child: LinearProgressIndicator(
                minHeight: 8,
                value: result.percentage / 100,
                backgroundColor: StudentColors.border,
              ),
            ),
            const SizedBox(height: StudentSpace.sm),
            Row(
              children: [
                StudentStatusPill(
                  label: aboveAverage
                      ? 'Above class average'
                      : 'Below class average',
                  icon: aboveAverage
                      ? Icons.trending_up_rounded
                      : Icons.trending_down_rounded,
                  color: aboveAverage
                      ? StudentColors.success
                      : StudentColors.warning,
                ),
                const Spacer(),
                Text(
                  'Class avg. ${result.classAverage.toStringAsFixed(0)}/${result.maximum.toStringAsFixed(0)}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SyllabusView extends StatelessWidget {
  const _SyllabusView();

  @override
  Widget build(BuildContext context) {
    const subjects = [
      ('Mathematics', 'Linear equations and geometry', 0.68),
      ('Science', 'Force, motion, and chemical reactions', 0.61),
      ('English', 'Literature analysis and creative writing', 0.74),
      ('Social Studies', 'Civics and geography', 0.52),
    ];

    return RefreshIndicator(
      onRefresh: () async =>
          Future<void>.delayed(const Duration(milliseconds: 350)),
      child: ListView(
        padding: const EdgeInsets.all(StudentSpace.md),
        children: [
          Text('Term 2 syllabus',
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: StudentSpace.xs),
          Text(
            'Follow the current topics and your class progress.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: StudentColors.mutedText,
                ),
          ),
          const SizedBox(height: StudentSpace.lg),
          for (final subject in subjects) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(StudentSpace.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.menu_book_outlined,
                            color: StudentColors.primary),
                        const SizedBox(width: StudentSpace.sm),
                        Expanded(
                          child: Text(subject.$1,
                              style: Theme.of(context).textTheme.titleMedium),
                        ),
                        Text('${(subject.$3 * 100).round()}%'),
                      ],
                    ),
                    const SizedBox(height: StudentSpace.sm),
                    Text(subject.$2),
                    const SizedBox(height: StudentSpace.sm),
                    LinearProgressIndicator(
                      value: subject.$3,
                      minHeight: 8,
                      borderRadius: BorderRadius.circular(StudentRadius.pill),
                      backgroundColor: StudentColors.border,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: StudentSpace.sm),
          ],
        ],
      ),
    );
  }
}

class _HomeworkView extends StatelessWidget {
  const _HomeworkView();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(StudentSpace.md),
      children: [
        Text('Pending homework', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: StudentSpace.sm),
        for (final item in StudentDemoData.homework) ...[
          Card(
            child: ListTile(
              minTileHeight: 84,
              leading: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: (item.dueAt.isBefore(DateTime.now())
                          ? StudentColors.error
                          : StudentColors.primary)
                      .withValues(alpha: .10),
                  borderRadius: BorderRadius.circular(StudentRadius.control),
                ),
                child: Icon(
                  item.dueAt.isBefore(DateTime.now())
                      ? Icons.priority_high_rounded
                      : Icons.assignment_outlined,
                  color: item.dueAt.isBefore(DateTime.now())
                      ? StudentColors.error
                      : StudentColors.primary,
                ),
              ),
              title: Text(item.title),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  '${item.subject} · ${_date(item.dueAt)}',
                  style: TextStyle(
                    color: item.dueAt.isBefore(DateTime.now())
                        ? StudentColors.error
                        : StudentColors.mutedText,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: StudentSpace.sm),
        ],
      ],
    );
  }
}

class _InsightsView extends StatelessWidget {
  const _InsightsView();

  @override
  Widget build(BuildContext context) {
    const insights = StudentDemoData.insights;
    final strongest = [...insights]
      ..sort((a, b) => b.average.compareTo(a.average));
    final weakest = [...insights]
      ..sort((a, b) => a.average.compareTo(b.average));
    return ListView(
      padding: const EdgeInsets.all(StudentSpace.md),
      children: [
        Row(
          children: [
            Expanded(
              child: _InsightSummary(
                label: 'Strongest',
                subject: strongest.first.subject,
                value: strongest.first.average,
                color: StudentColors.success,
                icon: Icons.workspace_premium_outlined,
              ),
            ),
            const SizedBox(width: StudentSpace.sm),
            Expanded(
              child: _InsightSummary(
                label: 'Needs focus',
                subject: weakest.first.subject,
                value: weakest.first.average,
                color: StudentColors.warning,
                icon: Icons.track_changes_rounded,
              ),
            ),
          ],
        ),
        const SizedBox(height: StudentSpace.lg),
        Text('Subject trends', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: StudentSpace.sm),
        for (final insight in insights) ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(StudentSpace.md),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(insight.subject,
                            style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: StudentSpace.xs),
                        LinearProgressIndicator(
                          minHeight: 7,
                          value: insight.average / 100,
                          borderRadius:
                              BorderRadius.circular(StudentRadius.pill),
                          backgroundColor: StudentColors.border,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: StudentSpace.md),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('${insight.average.toStringAsFixed(0)}%',
                          style: Theme.of(context).textTheme.titleMedium),
                      Text(
                        '${insight.trend} ${insight.change >= 0 ? '+' : ''}${insight.change.toStringAsFixed(0)}%',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: insight.change >= 0
                                  ? StudentColors.success
                                  : StudentColors.error,
                            ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: StudentSpace.sm),
        ],
        const SizedBox(height: StudentSpace.xs),
        Text(
          'Insights use averages across published tests and are read-only.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}

class _InsightSummary extends StatelessWidget {
  const _InsightSummary({
    required this.label,
    required this.subject,
    required this.value,
    required this.color,
    required this.icon,
  });

  final String label;
  final String subject;
  final double value;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(StudentSpace.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color),
            const SizedBox(height: StudentSpace.md),
            Text(label, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: StudentSpace.xxs),
            Text(subject, style: Theme.of(context).textTheme.titleMedium),
            Text('${value.toStringAsFixed(0)}%',
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: color, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}

String _date(DateTime value) =>
    '${value.day.toString().padLeft(2, '0')}/${value.month.toString().padLeft(2, '0')}/${value.year}';
