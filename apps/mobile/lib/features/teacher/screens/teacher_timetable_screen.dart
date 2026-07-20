import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:tms_mobile/core/theme/app_colors.dart';
import 'package:tms_mobile/core/utils/formatters.dart';
import 'package:tms_mobile/features/teacher/models/teacher_models.dart';

/// Teacher's weekly timetable screen.
///
/// Displays a tab-per-day view of all scheduled classes with time, room,
/// course name, and enrollment count. Uses demo data for Phase 1.
class TeacherTimetableScreen extends StatefulWidget {
  const TeacherTimetableScreen({super.key});

  @override
  State<TeacherTimetableScreen> createState() => _TeacherTimetableScreenState();
}

class _TeacherTimetableScreenState extends State<TeacherTimetableScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  @override
  void initState() {
    super.initState();
    // Start on the current day of the week (Sun=0).
    final todayIndex = (DateTime.now().weekday % 7);
    _tabController = TabController(
      length: _days.length,
      vsync: this,
      initialIndex: todayIndex < _days.length ? todayIndex : 0,
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<TeacherClassSession> _classesForDay(String day) {
    final allClasses = DemoTeacherData.weeklySchedule();
    return allClasses;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'My Timetable',
          style: GoogleFonts.fraunces(fontWeight: FontWeight.w700, fontSize: 22),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.go('/teacher/home'),
        ),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          indicatorColor: kColorAccent,
          labelColor: kColorPrimary,
          unselectedLabelColor: kColorText.withOpacity(0.55),
          tabs: _days.map((d) => Tab(text: d)).toList(),
        ),
      ),
      body: SafeArea(
        child: TabBarView(
          controller: _tabController,
          children: _days.map((day) {
            // For demo, show all weekly schedule items on each tab.
            final sessions = DemoTeacherData.weeklySchedule();
            if (sessions.isEmpty) {
              return Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.event_available_rounded,
                        size: 48, color: kColorText.withOpacity(0.35)),
                    const SizedBox(height: 12),
                    Text(
                      'No classes on $day',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: kColorText.withOpacity(0.55),
                          ),
                    ),
                  ],
                ),
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(20),
              itemCount: sessions.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final session = sessions[index];
                return _TimetableCard(session: session);
              },
            );
          }).toList(),
        ),
      ),
    );
  }
}

class _TimetableCard extends StatelessWidget {
  const _TimetableCard({required this.session});
  final TeacherClassSession session;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 4,
              height: 56,
              decoration: BoxDecoration(
                color: kColorAccent,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    session.subject,
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontSize: 16),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${formatShortTime(session.scheduledStart)} – ${formatShortTime(session.scheduledEnd)} • ${session.room}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: kColorPrimary.withOpacity(0.08),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${session.enrolledCount} students',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: kColorPrimary,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
