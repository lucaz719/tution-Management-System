import 'package:flutter/material.dart';

import '../../app/theme/app_colors.dart';
import '../utils/formatters.dart';

Future<void> showNepalPayQrSheet(
  BuildContext context, {
  required String title,
  required double amount,
}) {
  return showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    backgroundColor: Colors.white,
    builder: (BuildContext context) {
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Text(title, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(
                'Scan to continue with Nepal Pay',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: TmsAppColors.mutedText,
                    ),
              ),
              const SizedBox(height: 20),
              Container(
                width: 180,
                height: 180,
                decoration: BoxDecoration(
                  color: TmsAppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: TmsAppColors.border),
                ),
                child: const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: <Widget>[
                    Icon(
                      Icons.qr_code_2_rounded,
                      size: 56,
                      color: TmsAppColors.mutedText,
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Nepal Pay QR',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: TmsAppColors.mutedText,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                TmsFormatters.currency(amount),
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 12),
              Text(
                '// TODO(api): replace placeholder with live Nepal Pay QR payload.',
                style: Theme.of(context).textTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Done'),
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
}
