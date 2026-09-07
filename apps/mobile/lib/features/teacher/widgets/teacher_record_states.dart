/// Shared loading / empty / error / denied / offline states for teacher screens.
library;

import 'package:flutter/material.dart';
import 'package:tms_mobile/core/theme/app_colors.dart';

class TeacherLoadingView extends StatelessWidget {
  const TeacherLoadingView({super.key, this.message = 'Loading…'});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 12),
            Text(message, style: Theme.of(context).textTheme.bodyMedium),
          ],
        ),
      ),
    );
  }
}

class TeacherEmptyView extends StatelessWidget {
  const TeacherEmptyView({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: kColorText.withValues(alpha: 0.35)),
            const SizedBox(height: 12),
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(
              message,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: kColorText.withValues(alpha: 0.6),
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class TeacherErrorView extends StatelessWidget {
  const TeacherErrorView({
    super.key,
    required this.message,
    required this.onRetry,
    this.title = 'Something went wrong',
  });

  final String message;
  final VoidCallback onRetry;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline_rounded,
                size: 48, color: kColorText.withValues(alpha: 0.35)),
            const SizedBox(height: 12),
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(message,
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

class TeacherDeniedView extends StatelessWidget {
  const TeacherDeniedView({super.key, this.message});

  final String? message;

  @override
  Widget build(BuildContext context) {
    return TeacherEmptyView(
      icon: Icons.lock_outline_rounded,
      title: 'Access denied',
      message: message ??
          'Your account is not allowed to view this. Contact your branch admin.',
    );
  }
}

class TeacherOfflineView extends StatelessWidget {
  const TeacherOfflineView(
      {super.key, required this.onRetry, this.hasCachedData = false});

  final VoidCallback onRetry;
  final bool hasCachedData;

  @override
  Widget build(BuildContext context) {
    return TeacherEmptyView(
      icon: Icons.cloud_off_outlined,
      title: 'You are offline',
      message: hasCachedData
          ? 'Showing the last loaded data. Reconnect and retry for updates.'
          : 'No internet connection. Reconnect and try again.',
    );
  }
}

class TeacherOfflineBar extends StatelessWidget {
  const TeacherOfflineBar({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: kColorText.withValues(alpha: 0.08),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.cloud_off_outlined, size: 16),
          SizedBox(width: 8),
          Text('Offline — showing last loaded data'),
        ],
      ),
    );
  }
}
