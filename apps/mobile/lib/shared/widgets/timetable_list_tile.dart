import 'package:flutter/material.dart';

import '../../app/theme/app_colors.dart';
import '../models/app_models.dart';
import 'status_chip.dart';

class TimetableListTile extends StatelessWidget {
  const TimetableListTile({
    super.key,
    required this.entry,
  });

  final ScheduleEntry entry;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: TmsAppColors.divider),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: TmsAppColors.tint(TmsAppColors.primary, 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              entry.time,
              style: const TextStyle(
                color: TmsAppColors.primary,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  entry.subject,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${entry.teacher} · ${entry.room}',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: TmsAppColors.mutedText,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          StatusChip(
            label: entry.status.label,
            variant: entry.status.chipVariant,
          ),
        ],
      ),
    );
  }
}
