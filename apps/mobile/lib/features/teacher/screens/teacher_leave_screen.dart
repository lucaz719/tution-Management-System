import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:tms_mobile/core/theme/app_colors.dart';
import 'package:tms_mobile/shared/widgets/status_chip.dart';
import 'package:tms_mobile/shared/models/app_models.dart';

/// Teacher leave request screen.
///
/// Displays existing leave history and a FAB to submit a new request.
/// Uses demo data for Phase 1 — real API integration will use /api/leaves.
class TeacherLeaveScreen extends StatefulWidget {
  const TeacherLeaveScreen({super.key});

  @override
  State<TeacherLeaveScreen> createState() => _TeacherLeaveScreenState();
}

class _TeacherLeaveScreenState extends State<TeacherLeaveScreen> {
  final List<_LeaveRecord> _leaves = [
    _LeaveRecord(
      type: 'Casual Leave',
      startDate: DateTime(2026, 7, 10),
      endDate: DateTime(2026, 7, 11),
      reason: 'Family function',
      status: 'Approved',
    ),
    _LeaveRecord(
      type: 'Sick Leave',
      startDate: DateTime(2026, 7, 5),
      endDate: DateTime(2026, 7, 5),
      reason: 'Fever and cold',
      status: 'Approved',
    ),
    _LeaveRecord(
      type: 'Casual Leave',
      startDate: DateTime(2026, 7, 18),
      endDate: DateTime(2026, 7, 18),
      reason: 'Personal work',
      status: 'Pending',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Leave Requests',
          style: GoogleFonts.fraunces(fontWeight: FontWeight.w700, fontSize: 22),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.go('/teacher/home'),
        ),
      ),
      body: SafeArea(
        child: _leaves.isEmpty
            ? Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.event_available_rounded,
                        size: 48, color: kColorText.withOpacity(0.35)),
                    const SizedBox(height: 12),
                    Text(
                      'No leave requests yet',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: kColorText.withOpacity(0.55),
                          ),
                    ),
                  ],
                ),
              )
            : ListView.separated(
                padding: const EdgeInsets.all(20),
                itemCount: _leaves.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final leave = _leaves[index];
                  return _LeaveCard(leave: leave);
                },
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showNewLeaveDialog(context),
        backgroundColor: kColorAccent,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('New Request'),
      ),
    );
  }

  void _showNewLeaveDialog(BuildContext context) {
    final typeController = TextEditingController(text: 'Casual Leave');
    final reasonController = TextEditingController();

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'New Leave Request',
                style: GoogleFonts.fraunces(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: kColorText,
                ),
              ),
              const SizedBox(height: 20),
              DropdownButtonFormField<String>(
                value: typeController.text,
                decoration: const InputDecoration(labelText: 'Leave Type'),
                items: const [
                  DropdownMenuItem(value: 'Casual Leave', child: Text('Casual Leave')),
                  DropdownMenuItem(value: 'Sick Leave', child: Text('Sick Leave')),
                  DropdownMenuItem(value: 'Early Out', child: Text('Early Out')),
                ],
                onChanged: (value) => typeController.text = value ?? 'Casual Leave',
              ),
              const SizedBox(height: 16),
              TextField(
                controller: reasonController,
                decoration: const InputDecoration(
                  labelText: 'Reason',
                  hintText: 'Briefly describe the reason...',
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  if (reasonController.text.trim().isEmpty) {
                    ScaffoldMessenger.of(ctx).showSnackBar(
                      const SnackBar(content: Text('Please provide a reason.')),
                    );
                    return;
                  }
                  setState(() {
                    _leaves.insert(
                      0,
                      _LeaveRecord(
                        type: typeController.text,
                        startDate: DateTime.now(),
                        endDate: DateTime.now(),
                        reason: reasonController.text.trim(),
                        status: 'Pending',
                      ),
                    );
                  });
                  Navigator.of(ctx).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Leave request submitted.')),
                  );
                },
                child: const Text('Submit Request'),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _LeaveCard extends StatelessWidget {
  const _LeaveCard({required this.leave});
  final _LeaveRecord leave;

  String _formatDate(DateTime d) =>
      '${d.day}/${d.month}/${d.year}';

  @override
  Widget build(BuildContext context) {
    final dateRange = leave.startDate == leave.endDate
        ? _formatDate(leave.startDate)
        : '${_formatDate(leave.startDate)} – ${_formatDate(leave.endDate)}';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  leave.type.contains('Sick')
                      ? Icons.local_hospital_rounded
                      : Icons.beach_access_rounded,
                  color: kColorPrimary,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    leave.type,
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontSize: 16),
                  ),
                ),
                StatusChip(
                  label: leave.status,
                  variant: switch (leave.status) {
                    'Approved' => StatusChipVariant.success,
                    'Rejected' => StatusChipVariant.error,
                    _ => StatusChipVariant.warning,
                  },
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              dateRange,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: kColorText.withOpacity(0.65),
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              leave.reason,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}

class _LeaveRecord {
  const _LeaveRecord({
    required this.type,
    required this.startDate,
    required this.endDate,
    required this.reason,
    required this.status,
  });

  final String type;
  final DateTime startDate;
  final DateTime endDate;
  final String reason;
  final String status;
}
