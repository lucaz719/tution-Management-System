import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:tms_mobile/core/providers/child_selection_provider.dart';
import 'package:tms_mobile/core/providers/feature_flags_provider.dart';
import 'package:tms_mobile/core/theme/app_colors.dart';
import 'package:tms_mobile/features/parent/widgets/child_switcher_bar.dart';
import 'package:tms_mobile/shared/widgets/progress_ring.dart';

class ParentAcademicsScreen extends ConsumerStatefulWidget {
  const ParentAcademicsScreen({super.key});

  static const String routeName = '/parent/academics';

  @override
  ConsumerState<ParentAcademicsScreen> createState() =>
      _ParentAcademicsScreenState();
}

class _ParentAcademicsScreenState extends ConsumerState<ParentAcademicsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final selectedChild = ref.watch(childSelectionProvider);
    final isAarav = selectedChild == 'Aarav';
    final academicsEnabled =
        ref.watch(featureFlagsProvider).isEnabled(FeatureFlags.parentAcademics);

    if (!academicsEnabled) {
      return _buildFeatureDisabled(context, selectedChild);
    }

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
          tooltip: 'Back',
        ),
        title: Text(
          '$selectedChild\'s Academics',
          style:
              GoogleFonts.fraunces(fontWeight: FontWeight.w700, fontSize: 22),
        ),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.menu_book_rounded), text: 'Syllabus'),
            Tab(icon: Icon(Icons.show_chart_rounded), text: 'Performance'),
          ],
          labelStyle: GoogleFonts.fraunces(fontWeight: FontWeight.w600),
        ),
      ),
      body: SafeArea(
        child: TabBarView(
          controller: _tabController,
          children: [
            _buildSyllabusTab(context, selectedChild, isAarav),
            _buildPerformanceTab(context, selectedChild, isAarav),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureDisabled(BuildContext context, String selectedChild) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
          tooltip: 'Back',
        ),
        title: Text(
          'Academics',
          style:
              GoogleFonts.fraunces(fontWeight: FontWeight.w700, fontSize: 22),
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.school_outlined,
                size: 64,
                color: kColorText.withValues(alpha: 0.4),
              ),
              const SizedBox(height: 16),
              Text(
                'Academics Feature Disabled',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: kColorText,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'The academics view for $selectedChild is currently disabled. Please contact the school administrator.',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: kColorText.withValues(alpha: 0.7),
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: () => context.go('/parent/home'),
                icon: const Icon(Icons.home_outlined),
                label: const Text('Back to Dashboard'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSyllabusTab(
      BuildContext context, String selectedChild, bool isAarav) {
    final syllabusData = isAarav ? _aaravSyllabus() : _miraSyllabus();

    return RefreshIndicator(
      onRefresh: () async => Future.delayed(const Duration(milliseconds: 350)),
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const ChildSwitcherBar(),
          const SizedBox(height: 20),

          // Current Term Header
          Card(
            color: kColorPrimary,
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Term 2 • 2026-27',
                    style: GoogleFonts.outfit(
                      color: Colors.white.withValues(alpha: 0.85),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '$selectedChild\'s Curriculum',
                    style: GoogleFonts.fraunces(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _SyllabusStat(
                        label: 'Subjects',
                        value: syllabusData.length.toString(),
                        color: Colors.white,
                      ),
                      const SizedBox(width: 16),
                      _SyllabusStat(
                        label: 'Completed',
                        value: syllabusData
                            .where((s) => s.completion >= 1.0)
                            .length
                            .toString(),
                        color: Colors.white,
                      ),
                      const SizedBox(width: 16),
                      _SyllabusStat(
                        label: 'In Progress',
                        value: syllabusData
                            .where(
                                (s) => s.completion > 0 && s.completion < 1.0)
                            .length
                            .toString(),
                        color: Colors.white,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Subject List
          Text(
            'Subjects & Progress',
            style:
                GoogleFonts.fraunces(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),

          for (final subject in syllabusData) ...[
            _SyllabusCard(subject: subject),
            const SizedBox(height: 12),
          ],
        ],
      ),
    );
  }

  Widget _buildPerformanceTab(
      BuildContext context, String selectedChild, bool isAarav) {
    final performanceData = isAarav ? _aaravPerformance() : _miraPerformance();

    return RefreshIndicator(
      onRefresh: () async => Future.delayed(const Duration(milliseconds: 350)),
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const ChildSwitcherBar(),
          const SizedBox(height: 20),

          // Overall Performance Summary
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  ProgressRing(
                    percent: performanceData.overallScore,
                    size: 84,
                    strokeWidth: 8,
                    color: performanceData.overallScore >= 0.8
                        ? kColorSuccess
                        : performanceData.overallScore >= 0.6
                            ? kColorWarning
                            : kColorError,
                  ),
                  const SizedBox(width: 20),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Overall Score',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Academic Year 2026-27',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _PerformanceStat(
                              label: 'Average',
                              value:
                                  '${(performanceData.overallScore * 100).round()}%',
                              color: kColorPrimary,
                            ),
                            _PerformanceStat(
                              label: 'Rank',
                              value: performanceData.classRank,
                              color: kColorInfo,
                            ),
                            _PerformanceStat(
                              label: 'Trend',
                              value: performanceData.trendLabel,
                              color: performanceData.trendColor,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Subject-wise Performance
          Text(
            'Subject Performance',
            style:
                GoogleFonts.fraunces(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),

          ...performanceData.subjects.map((subject) => Column(
                children: [
                  _SubjectPerformanceCard(subject: subject),
                  const SizedBox(height: 12),
                ],
              )),

          const SizedBox(height: 24),

          // Assessment History
          Text(
            'Recent Assessments',
            style:
                GoogleFonts.fraunces(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),

          ...performanceData.recentAssessments.map((assessment) => Column(
                children: [
                  _AssessmentCard(assessment: assessment),
                  const SizedBox(height: 10),
                ],
              )),
        ],
      ),
    );
  }

  // Demo data for Aarav (Grade 8)
  List<SyllabusSubject> _aaravSyllabus() => [
        SyllabusSubject(
          name: 'Mathematics',
          teacher: 'Mr. Sharma',
          topics: [
            SyllabusTopic('Algebraic Expressions', 1.0),
            SyllabusTopic('Linear Equations', 0.85),
            SyllabusTopic('Quadratic Equations', 0.6),
            SyllabusTopic('Geometry - Triangles', 0.3),
            SyllabusTopic('Statistics & Probability', 0.0),
          ],
          completion: 0.55,
          color: kColorPrimary,
        ),
        SyllabusSubject(
          name: 'Science',
          teacher: 'Ms. Patel',
          topics: [
            SyllabusTopic('Cell Structure', 1.0),
            SyllabusTopic('Force & Motion', 0.9),
            SyllabusTopic('Chemical Reactions', 0.5),
            SyllabusTopic('Electricity', 0.2),
          ],
          completion: 0.65,
          color: kColorSuccess,
        ),
        SyllabusSubject(
          name: 'English',
          teacher: 'Mrs. Singh',
          topics: [
            SyllabusTopic('Reading Comprehension', 1.0),
            SyllabusTopic('Creative Writing', 0.8),
            SyllabusTopic('Grammar - Advanced', 0.7),
            SyllabusTopic('Literature Analysis', 0.4),
          ],
          completion: 0.72,
          color: kColorInfo,
        ),
        SyllabusSubject(
          name: 'Social Studies',
          teacher: 'Mr. Kumar',
          topics: [
            SyllabusTopic('Indian History - Medieval', 1.0),
            SyllabusTopic('Geography - Resources', 0.75),
            SyllabusTopic('Civics - Constitution', 0.4),
          ],
          completion: 0.72,
          color: kColorWarning,
        ),
        SyllabusSubject(
          name: 'Hindi',
          teacher: 'Mrs. Gupta',
          topics: [
            SyllabusTopic('Grammar', 1.0),
            SyllabusTopic('Literature', 0.9),
            SyllabusTopic('Essay Writing', 0.6),
          ],
          completion: 0.83,
          color: kColorAccent,
        ),
      ];

  // Demo data for Mira (Grade 5)
  List<SyllabusSubject> _miraSyllabus() => [
        SyllabusSubject(
          name: 'Mathematics',
          teacher: 'Ms. Reddy',
          topics: [
            SyllabusTopic('Multiplication & Division', 1.0),
            SyllabusTopic('Fractions', 0.9),
            SyllabusTopic('Decimals', 0.7),
            SyllabusTopic('Basic Geometry', 0.4),
          ],
          completion: 0.75,
          color: kColorPrimary,
        ),
        SyllabusSubject(
          name: 'EVS',
          teacher: 'Mr. Nair',
          topics: [
            SyllabusTopic('Plants Around Us', 1.0),
            SyllabusTopic('Animals & Habitats', 0.85),
            SyllabusTopic('Water & Air', 0.5),
            SyllabusTopic('Our Environment', 0.3),
          ],
          completion: 0.66,
          color: kColorSuccess,
        ),
        SyllabusSubject(
          name: 'English',
          teacher: 'Mrs. Iyer',
          topics: [
            SyllabusTopic('Reading Stories', 1.0),
            SyllabusTopic('Vocabulary Building', 0.95),
            SyllabusTopic('Sentence Formation', 0.8),
            SyllabusTopic('Poetry', 0.6),
          ],
          completion: 0.84,
          color: kColorInfo,
        ),
        SyllabusSubject(
          name: 'Hindi',
          teacher: 'Mrs. Verma',
          topics: [
            SyllabusTopic('Varnamala', 1.0),
            SyllabusTopic('Simple Words', 0.9),
            SyllabusTopic('Reading Practice', 0.7),
          ],
          completion: 0.87,
          color: kColorAccent,
        ),
      ];

  // Performance data for Aarav
  ChildPerformance _aaravPerformance() => ChildPerformance(
        overallScore: 0.78,
        classRank: '12/45',
        trendLabel: '↑ Improving',
        trendColor: kColorSuccess,
        subjects: [
          SubjectPerformance(
            name: 'Mathematics',
            score: 0.72,
            rank: '15/45',
            trend: 'stable',
            color: kColorPrimary,
          ),
          SubjectPerformance(
            name: 'Science',
            score: 0.85,
            rank: '5/45',
            trend: 'improving',
            color: kColorSuccess,
          ),
          SubjectPerformance(
            name: 'English',
            score: 0.82,
            rank: '8/45',
            trend: 'improving',
            color: kColorInfo,
          ),
          SubjectPerformance(
            name: 'Social Studies',
            score: 0.70,
            rank: '18/45',
            trend: 'declining',
            color: kColorWarning,
          ),
          SubjectPerformance(
            name: 'Hindi',
            score: 0.79,
            rank: '10/45',
            trend: 'stable',
            color: kColorAccent,
          ),
        ],
        recentAssessments: [
          Assessment('Mathematics', 'Unit Test - Quadratic Equations', '72%',
              '2026-07-15', kColorPrimary),
          Assessment('Science', 'Lab Practical - Chemical Reactions', '88%',
              '2026-07-12', kColorSuccess),
          Assessment('English', 'Essay Writing Assessment', '85%', '2026-07-10',
              kColorInfo),
          Assessment('Social Studies', 'Map Work Test', '68%', '2026-07-08',
              kColorWarning),
          Assessment('Hindi', 'Reading Comprehension', '81%', '2026-07-05',
              kColorAccent),
        ],
      );

  // Performance data for Mira
  ChildPerformance _miraPerformance() => ChildPerformance(
        overallScore: 0.84,
        classRank: '5/38',
        trendLabel: '↑ Improving',
        trendColor: kColorSuccess,
        subjects: [
          SubjectPerformance(
            name: 'Mathematics',
            score: 0.88,
            rank: '3/38',
            trend: 'improving',
            color: kColorPrimary,
          ),
          SubjectPerformance(
            name: 'EVS',
            score: 0.82,
            rank: '6/38',
            trend: 'stable',
            color: kColorSuccess,
          ),
          SubjectPerformance(
            name: 'English',
            score: 0.86,
            rank: '4/38',
            trend: 'improving',
            color: kColorInfo,
          ),
          SubjectPerformance(
            name: 'Hindi',
            score: 0.79,
            rank: '8/38',
            trend: 'stable',
            color: kColorAccent,
          ),
        ],
        recentAssessments: [
          Assessment('Mathematics', 'Fractions Quiz', '92%', '2026-07-14',
              kColorPrimary),
          Assessment(
              'EVS', 'Habitat Project', '85%', '2026-07-11', kColorSuccess),
          Assessment(
              'English', 'Vocabulary Test', '89%', '2026-07-09', kColorInfo),
          Assessment(
              'Hindi', 'Reading Assessment', '82%', '2026-07-06', kColorAccent),
        ],
      );
}

// Data Models
class SyllabusSubject {
  final String name;
  final String teacher;
  final List<SyllabusTopic> topics;
  final double completion;
  final Color color;

  SyllabusSubject({
    required this.name,
    required this.teacher,
    required this.topics,
    required this.completion,
    required this.color,
  });
}

class SyllabusTopic {
  final String name;
  final double completion; // 0.0 to 1.0

  SyllabusTopic(this.name, this.completion);
}

class ChildPerformance {
  final double overallScore;
  final String classRank;
  final String trendLabel;
  final Color trendColor;
  final List<SubjectPerformance> subjects;
  final List<Assessment> recentAssessments;

  ChildPerformance({
    required this.overallScore,
    required this.classRank,
    required this.trendLabel,
    required this.trendColor,
    required this.subjects,
    required this.recentAssessments,
  });
}

class SubjectPerformance {
  final String name;
  final double score;
  final String rank;
  final String trend; // 'improving', 'stable', 'declining'
  final Color color;

  SubjectPerformance({
    required this.name,
    required this.score,
    required this.rank,
    required this.trend,
    required this.color,
  });
}

class Assessment {
  final String subject;
  final String title;
  final String score;
  final String date;
  final Color color;

  Assessment(this.subject, this.title, this.score, this.date, this.color);
}

// UI Components
class _SyllabusStat extends StatelessWidget {
  const _SyllabusStat({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: GoogleFonts.outfit(
            fontWeight: FontWeight.w700,
            fontSize: 20,
            color: color,
          ),
        ),
        Text(
          label,
          style: GoogleFonts.outfit(
            color: Colors.white.withValues(alpha: 0.8),
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}

class _SyllabusCard extends StatelessWidget {
  const _SyllabusCard({required this.subject});

  final SyllabusSubject subject;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: subject.color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child:
                      Icon(Icons.book_rounded, color: subject.color, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        subject.name,
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                      ),
                      Text(
                        'Taught by ${subject.teacher}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: kColorText.withValues(alpha: 0.6),
                            ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${(subject.completion * 100).round()}%',
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                        color: subject.color,
                      ),
                    ),
                    Text(
                      'Complete',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: kColorText.withValues(alpha: 0.6),
                          ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Progress bar
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: subject.completion,
                minHeight: 8,
                backgroundColor: subject.color.withValues(alpha: 0.15),
                valueColor: AlwaysStoppedAnimation<Color>(subject.color),
              ),
            ),
            const SizedBox(height: 12),
            // Topics
            for (int i = 0; i < subject.topics.length; i++) ...[
              _TopicRow(
                topic: subject.topics[i],
                color: subject.color,
                isLast: i == subject.topics.length - 1,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _TopicRow extends StatelessWidget {
  const _TopicRow({
    required this.topic,
    required this.color,
    required this.isLast,
  });

  final SyllabusTopic topic;
  final Color color;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: topic.completion >= 1.0
                  ? color
                  : color.withValues(alpha: 0.4),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              topic.name,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: topic.completion >= 1.0
                        ? kColorText
                        : kColorText.withValues(alpha: 0.6),
                    decoration: topic.completion >= 1.0
                        ? null
                        : TextDecoration.lineThrough,
                  ),
            ),
          ),
          Text(
            '${(topic.completion * 100).round()}%',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      ),
    );
  }
}

class _PerformanceStat extends StatelessWidget {
  const _PerformanceStat({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: GoogleFonts.outfit(
            fontWeight: FontWeight.w700,
            fontSize: 16,
            color: color,
          ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: kColorText.withValues(alpha: 0.6),
                fontSize: 11,
              ),
        ),
      ],
    );
  }
}

class _SubjectPerformanceCard extends StatelessWidget {
  const _SubjectPerformanceCard({required this.subject});

  final SubjectPerformance subject;

  @override
  Widget build(BuildContext context) {
    Color trendColor;
    IconData trendIcon;
    switch (subject.trend) {
      case 'improving':
        trendColor = kColorSuccess;
        trendIcon = Icons.trending_up_rounded;
        break;
      case 'declining':
        trendColor = kColorError;
        trendIcon = Icons.trending_down_rounded;
        break;
      default:
        trendColor = kColorWarning;
        trendIcon = Icons.trending_flat_rounded;
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: subject.color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(Icons.menu_book_rounded,
                      color: subject.color, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        subject.name,
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                      ),
                      Text(
                        'Class Rank: ${subject.rank}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: kColorText.withValues(alpha: 0.6),
                            ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(trendIcon, size: 16, color: trendColor),
                        const SizedBox(width: 4),
                        Text(
                          subject.trend.capitalize(),
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: trendColor,
                                    fontWeight: FontWeight.w600,
                                  ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${(subject.score * 100).round()}%',
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.w700,
                        fontSize: 20,
                        color: subject.color,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: subject.score,
                minHeight: 8,
                backgroundColor: subject.color.withValues(alpha: 0.15),
                valueColor: AlwaysStoppedAnimation<Color>(subject.color),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AssessmentCard extends StatelessWidget {
  const _AssessmentCard({required this.assessment});

  final Assessment assessment;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: assessment.color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(8),
          ),
          child:
              Icon(Icons.assignment_rounded, color: assessment.color, size: 20),
        ),
        title: Text(
          assessment.title,
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        subtitle: Text('${assessment.subject} · ${assessment.date}'),
        trailing: Text(
          assessment.score,
          style: GoogleFonts.outfit(
            fontWeight: FontWeight.w700,
            fontSize: 16,
            color: assessment.color,
          ),
        ),
      ),
    );
  }
}

extension StringExtension on String {
  String capitalize() => '${this[0].toUpperCase()}${substring(1)}';
}
