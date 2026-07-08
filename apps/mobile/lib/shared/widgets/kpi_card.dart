import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../app/theme/app_colors.dart';
import 'skeleton_loader.dart';

class KpiCard extends StatelessWidget {
  const KpiCard({
    super.key,
    required this.title,
    required this.value,
    this.deltaText,
    this.deltaPositive = true,
    this.loading = false,
  });

  final String title;
  final String value;
  final String? deltaText;
  final bool deltaPositive;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: loading
            ? const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  SkeletonLoader(height: 16, width: 120, borderRadius: 8),
                  SizedBox(height: 12),
                  SkeletonLoader(height: 28, width: 180, borderRadius: 10),
                  SizedBox(height: 10),
                  SkeletonLoader(height: 12, width: 96, borderRadius: 8),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: TmsAppColors.mutedText,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    value,
                    style: GoogleFonts.fraunces(
                      fontSize: 24,
                      fontWeight: FontWeight.w600,
                      color: TmsAppColors.text,
                    ),
                  ),
                  if (deltaText != null) ...<Widget>[
                    const SizedBox(height: 8),
                    Text(
                      deltaText!,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: deltaPositive
                            ? TmsAppColors.success
                            : TmsAppColors.error,
                      ),
                    ),
                  ],
                ],
              ),
      ),
    );
  }
}
