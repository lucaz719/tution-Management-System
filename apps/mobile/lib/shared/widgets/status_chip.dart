import 'package:flutter/material.dart';

import '../../app/theme/app_colors.dart';
import '../models/app_models.dart';

class StatusChip extends StatelessWidget {
  const StatusChip({
    super.key,
    required this.label,
    required this.variant,
  });

  final String label;
  final StatusChipVariant variant;

  @override
  Widget build(BuildContext context) {
    final _ChipColors colors = _resolveColors(variant);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: colors.background,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: colors.foreground,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  _ChipColors _resolveColors(StatusChipVariant variant) {
    return switch (variant) {
      StatusChipVariant.success => _ChipColors(
          background: TmsAppColors.tint(TmsAppColors.success, 0.12),
          foreground: TmsAppColors.success,
        ),
      StatusChipVariant.warning => _ChipColors(
          background: TmsAppColors.tint(TmsAppColors.warning, 0.12),
          foreground: TmsAppColors.warning,
        ),
      StatusChipVariant.error => _ChipColors(
          background: TmsAppColors.tint(TmsAppColors.error, 0.12),
          foreground: TmsAppColors.error,
        ),
      StatusChipVariant.info => _ChipColors(
          background: TmsAppColors.tint(TmsAppColors.info, 0.12),
          foreground: TmsAppColors.info,
        ),
      StatusChipVariant.gold => const _ChipColors(
          background: TmsAppColors.accent,
          foreground: Colors.white,
        ),
    };
  }
}

class _ChipColors {
  const _ChipColors({
    required this.background,
    required this.foreground,
  });

  final Color background;
  final Color foreground;
}
