import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tms_mobile/core/router/app_router.dart';
import 'package:tms_mobile/core/theme/app_theme.dart';

void main() {
  runApp(const ProviderScope(child: TMSApp()));
}

class TMSApp extends ConsumerWidget {
  const TMSApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    return MaterialApp.router(
      title: 'TMS',
      theme: AppTheme.lightTheme,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
