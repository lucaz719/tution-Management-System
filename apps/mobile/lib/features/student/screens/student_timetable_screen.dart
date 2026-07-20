import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:tms_mobile/core/theme/app_colors.dart';
import 'package:tms_mobile/shared/data/mock_portal_data.dart';
import 'package:tms_mobile/shared/widgets/timetable_list_tile.dart';

class StudentTimetableScreen extends StatefulWidget {
  const StudentTimetableScreen({super.key});

  @override
  State<StudentTimetableScreen> createState() => _StudentTimetableScreenState();
}

class _StudentTimetableScreenState extends State<StudentTimetableScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _days = MockPortalData.student.weeklySchedule;

  @override
  void initState() {
    super.initState();
    // Default to current weekday index (0-based)
    final todayIdx = (DateTime.now().weekday - 1) % 6;
    _tabController = TabController(
      length: _days.length,
      vsync: this,
      initialIndex: todayIdx < _days.length ? todayIdx : 0,
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'My Weekly Timetable',
          style: GoogleFonts.fraunces(fontWeight: FontWeight.w700, fontSize: 22),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.go('/student/home'),
        ),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          indicatorColor: kColorAccent,
          labelColor: kColorPrimary,
          unselectedLabelColor: kColorText.withOpacity(0.6),
          tabs: _days.map((day) => Tab(text: day.dayLabel)).toList(),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              color: kColorPrimary.withOpacity(0.04),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded, size: 18, color: kColorPrimary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Tap any session to view course syllabus & class location details.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: kColorPrimary),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: _days.map((day) {
                  if (day.classes.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.event_busy_rounded, size: 48, color: kColorText.withOpacity(0.3)),
                          const SizedBox(height: 12),
                          Text(
                            'No classes scheduled for ${day.dayLabel}.',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: kColorText.withOpacity(0.55),
                                ),
                          ),
                        ],
                      ),
                    );
                  }
                  return ListView.builder(
                    padding: const EdgeInsets.all(20),
                    itemCount: day.classes.length,
                    itemBuilder: (context, index) {
                      final entry = day.classes[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: TimetableListTile(entry: entry),
                      );
                    },
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
