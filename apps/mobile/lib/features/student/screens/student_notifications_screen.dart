import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/student_demo_data.dart';
import '../student_design.dart';
import '../widgets/student_scaffold.dart';

class StudentNotificationsScreen extends StatelessWidget {
  const StudentNotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return StudentScaffold(
      title: 'Notifications',
      actions: [
        TextButton(
          onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('All notifications marked as read.')),
          ),
          child: const Text('Mark all read'),
        ),
      ],
      body: ListView.separated(
        padding: const EdgeInsets.all(StudentSpace.md),
        itemCount: StudentDemoData.notices.length,
        separatorBuilder: (_, __) => const SizedBox(height: StudentSpace.sm),
        itemBuilder: (context, index) {
          final notice = StudentDemoData.notices[index];
          return Card(
            color: notice.isRead
                ? StudentColors.background
                : StudentColors.primary.withOpacity(.04),
            child: InkWell(
              borderRadius: BorderRadius.circular(StudentRadius.card),
              onTap: () => context.go(notice.route),
              child: Padding(
                padding: const EdgeInsets.all(StudentSpace.md),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      margin: const EdgeInsets.only(top: 6),
                      decoration: BoxDecoration(
                        color: notice.isRead
                            ? StudentColors.border
                            : StudentColors.primary,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: StudentSpace.sm),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            notice.title,
                            style:
                                Theme.of(context).textTheme.titleMedium?.copyWith(
                                      fontWeight: notice.isRead
                                          ? FontWeight.w600
                                          : FontWeight.w800,
                                    ),
                          ),
                          const SizedBox(height: StudentSpace.xxs),
                          Text(notice.message),
                          const SizedBox(height: StudentSpace.xs),
                          Text(
                            _relativeTime(notice.createdAt),
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, size: 20),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

String _relativeTime(DateTime date) {
  final difference = DateTime.now().difference(date);
  if (difference.inDays > 0) return '${difference.inDays}d ago';
  if (difference.inHours > 0) return '${difference.inHours}h ago';
  return '${difference.inMinutes}m ago';
}
