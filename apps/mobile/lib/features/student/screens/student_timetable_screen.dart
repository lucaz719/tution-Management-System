import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
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
    _tabController = TabController(length: _days.length, vsync: this);
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
        title: const Text('My Timetable'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.go('/student/home'),
        ),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: _days
              .map((day) => Tab(text: day.dayLabel))
              .toList(),
        ),
      ),
      body: SafeArea(
        child: TabBarView(
          controller: _tabController,
          children: _days.map((day) {
            if (day.classes.isEmpty) {
              return const Center(
                child: Text('No classes scheduled for this day.'),
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: day.classes.length,
              itemBuilder: (context, index) {
                final entry = day.classes[index];
                return TimetableListTile(entry: entry);
              },
            );
          }).toList(),
        ),
      ),
    );
  }
}
