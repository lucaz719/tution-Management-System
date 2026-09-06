import 'package:flutter/material.dart';

import '../breakpoints.dart';

typedef ResponsiveWidgetBuilder = Widget Function(
  BuildContext context,
  LayoutSizeClass sizeClass,
);

/// Builds a layout from the current width class.
class ResponsiveBuilder extends StatelessWidget {
  const ResponsiveBuilder({super.key, required this.builder});

  final ResponsiveWidgetBuilder builder;

  @override
  Widget build(BuildContext context) =>
      builder(context, Breakpoints.fromWidth(MediaQuery.sizeOf(context).width));
}

class AdaptiveNavigationDestination {
  const AdaptiveNavigationDestination({
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });

  final Widget icon;
  final Widget selectedIcon;
  final String label;
}

/// Uses a bottom navigation bar on phones and a navigation rail on larger
/// screens while keeping the selected page controlled by the caller.
class AdaptiveScaffold extends StatelessWidget {
  const AdaptiveScaffold({
    super.key,
    required this.selectedIndex,
    required this.onDestinationSelected,
    required this.destinations,
    required this.body,
    this.sidebar,
    this.appBar,
  });

  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;
  final List<AdaptiveNavigationDestination> destinations;
  final Widget Function(BuildContext context, int index) body;
  final Widget? sidebar;
  final PreferredSizeWidget? appBar;

  @override
  Widget build(BuildContext context) {
    final isCompact =
        Breakpoints.fromWidth(MediaQuery.sizeOf(context).width).isCompact;
    final content = body(context, selectedIndex);

    if (isCompact) {
      return Scaffold(
        appBar: appBar,
        body: content,
        bottomNavigationBar: NavigationBar(
          selectedIndex: selectedIndex,
          onDestinationSelected: onDestinationSelected,
          destinations: [
            for (final destination in destinations)
              NavigationDestination(
                icon: destination.icon,
                selectedIcon: destination.selectedIcon,
                label: destination.label,
              ),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: appBar,
      body: Row(
        children: [
          NavigationRail(
            selectedIndex: selectedIndex,
            onDestinationSelected: onDestinationSelected,
            labelType: NavigationRailLabelType.all,
            destinations: [
              for (final destination in destinations)
                NavigationRailDestination(
                  icon: destination.icon,
                  selectedIcon: destination.selectedIcon,
                  label: Text(destination.label),
                ),
            ],
          ),
          if (sidebar != null) const VerticalDivider(width: 1),
          if (sidebar != null) sidebar!,
          const VerticalDivider(width: 1),
          Expanded(child: content),
        ],
      ),
    );
  }
}
