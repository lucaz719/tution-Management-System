import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tms_mobile/features/tenant_admin/models/tenant_admin_dashboard.dart';
import 'package:tms_mobile/features/tenant_admin/viewmodels/tenant_admin_viewmodel.dart';

/// Common loading/error/empty handling for API-backed tenant admin screens.
class TenantAdminStateView extends ConsumerWidget {
  const TenantAdminStateView({
    super.key,
    required this.builder,
    this.padding = const EdgeInsets.all(20),
  });

  final Widget Function(
    BuildContext context,
    TenantAdminDashboard dashboard,
  ) builder;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(tenantAdminProvider);
    final notifier = ref.read(tenantAdminProvider.notifier);

    if (state.isLoading && !state.hasData) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.error != null && !state.hasData) {
      final title = state.isOffline
          ? 'You are offline'
          : state.isDenied
              ? 'Access denied'
              : 'Could not load tenant dashboard';
      return _DashboardMessage(
        title: title,
        message: state.error!,
        actionLabel: 'Retry',
        onAction: notifier.load,
      );
    }

    final dashboard = state.dashboard;
    if (dashboard == null) {
      return const _DashboardMessage(
        title: 'No dashboard data',
        message:
            'The tenant dashboard is unavailable for this authenticated account.',
      );
    }

    return RefreshIndicator(
      onRefresh: notifier.refresh,
      child: ListView(
        padding: padding,
        children: [
          if (state.error != null)
            Card(
              color: Theme.of(context).colorScheme.errorContainer,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Text(state.error!),
              ),
            ),
          builder(context, dashboard),
        ],
      ),
    );
  }
}

class _DashboardMessage extends StatelessWidget {
  const _DashboardMessage({
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.info_outline_rounded, size: 48),
            const SizedBox(height: 12),
            Text(title, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
            if (onAction != null) ...[
              const SizedBox(height: 20),
              OutlinedButton(
                onPressed: onAction,
                child: Text(actionLabel ?? 'Try again'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
