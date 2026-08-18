/// Capability/Policy pattern for adaptive UI.
///
/// Based on flutter-adaptive-ui skill:
/// - [Capability] = what a widget *can* do (e.g., showSidebar, useTwoColumns)
/// - [Policy] = how the app *should* behave at a given breakpoint
///
/// This enables declarative adaptive behavior: "if capability X is available, do Y"
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'breakpoints.dart';

/// A capability that a widget or layout can support.
///
/// Capabilities are declarative — they describe WHAT is possible,
/// not WHEN it should be used.
@immutable
abstract class AdaptiveCapability {
  const AdaptiveCapability();

  /// The minimum size class required for this capability.
  LayoutSizeClass get minSizeClass;

  /// Whether this capability is available at the given size class.
  bool isAvailableAt(LayoutSizeClass sizeClass) =>
      sizeClass.index >= minSizeClass.index;
}

/// Capability: Show a persistent sidebar/navigation rail.
class ShowSidebar extends AdaptiveCapability {
  const ShowSidebar();
  @override
  LayoutSizeClass get minSizeClass => LayoutSizeClass.medium;
}

/// Capability: Use two-column layout (master-detail).
class UseTwoColumns extends AdaptiveCapability {
  const UseTwoColumns();
  @override
  LayoutSizeClass get minSizeClass => LayoutSizeClass.medium;
}

/// Capability: Use three-column layout (master-detail-detail).
class UseThreeColumns extends AdaptiveCapability {
  const UseThreeColumns();
  @override
  LayoutSizeClass get minSizeClass => LayoutSizeClass.expanded;
}

/// Capability: Show navigation rail instead of bottom nav.
class UseNavigationRail extends AdaptiveCapability {
  const UseNavigationRail();
  @override
  LayoutSizeClass get minSizeClass => LayoutSizeClass.medium;
}

/// Capability: Show bottom navigation bar.
class UseBottomNavigation extends AdaptiveCapability {
  const UseBottomNavigation();
  @override
  LayoutSizeClass get minSizeClass => LayoutSizeClass.compact;
}

/// Capability: Use side sheet instead of full-screen modal.
class UseSideSheet extends AdaptiveCapability {
  const UseSideSheet();
  @override
  LayoutSizeClass get minSizeClass => LayoutSizeClass.medium;
}

/// Capability: Use modal bottom sheet on compact, side sheet on larger.
class UseAdaptiveSheet extends AdaptiveCapability {
  const UseAdaptiveSheet();
  @override
  LayoutSizeClass get minSizeClass => LayoutSizeClass.compact;
}

/// Capability: Show expanded app bar with more actions.
class UseExpandedAppBar extends AdaptiveCapability {
  const UseExpandedAppBar();
  @override
  LayoutSizeClass get minSizeClass => LayoutSizeClass.medium;
}

/// Capability: Use dense content spacing.
class UseDenseSpacing extends AdaptiveCapability {
  const UseDenseSpacing();
  @override
  LayoutSizeClass get minSizeClass => LayoutSizeClass.compact;
}

/// Capability: Use comfortable content spacing.
class UseComfortableSpacing extends AdaptiveCapability {
  const UseComfortableSpacing();
  @override
  LayoutSizeClass get minSizeClass => LayoutSizeClass.medium;
}

/// Capability: Show data table instead of card list.
class UseDataTable extends AdaptiveCapability {
  const UseDataTable();
  @override
  LayoutSizeClass get minSizeClass => LayoutSizeClass.expanded;
}

/// Capability: Show hover states (desktop/web).
class UseHoverEffects extends AdaptiveCapability {
  const UseHoverEffects();
  @override
  LayoutSizeClass get minSizeClass => LayoutSizeClass.medium;
}

/// Capability: Use drag-and-drop interactions.
class UseDragAndDrop extends AdaptiveCapability {
  const UseDragAndDrop();
  @override
  LayoutSizeClass get minSizeClass => LayoutSizeClass.medium;
}

/// A policy determines which capabilities are enabled at a given breakpoint.
///
/// Policies are the "rules" — they decide WHAT capabilities are available
/// based on the current size class and platform.
@immutable
abstract class AdaptivePolicy {
  const AdaptivePolicy();

  /// Returns the set of capabilities enabled for the given size class.
  Set<AdaptiveCapability> capabilitiesFor(LayoutSizeClass sizeClass);
}

/// Default TMS policy implementing standard Material 3 adaptive behavior.
class TmsAdaptivePolicy extends AdaptivePolicy {
  const TmsAdaptivePolicy();

  @override
  Set<AdaptiveCapability> capabilitiesFor(LayoutSizeClass sizeClass) {
    final capabilities = <AdaptiveCapability>{
      const UseBottomNavigation(),
      const UseDenseSpacing(),
      const UseAdaptiveSheet(),
    };

    if (sizeClass.isAtLeastMedium) {
      capabilities.addAll({
        const ShowSidebar(),
        const UseNavigationRail(),
        const UseTwoColumns(),
        const UseComfortableSpacing(),
        const UseSideSheet(),
        const UseExpandedAppBar(),
        const UseHoverEffects(),
        const UseDragAndDrop(),
      });
    }

    if (sizeClass.isAtLeastExpanded) {
      capabilities.addAll({
        const UseThreeColumns(),
        const UseDataTable(),
      });
    }

    return capabilities;
  }
}

/// Policy for authentication flows (login, 2FA, password reset).
///
/// Auth flows are typically centered and constrained regardless of screen size.
class AuthAdaptivePolicy extends AdaptivePolicy {
  const AuthAdaptivePolicy();

  @override
  Set<AdaptiveCapability> capabilitiesFor(LayoutSizeClass sizeClass) {
    // Auth screens always use centered single-column layout
    return {
      const UseBottomNavigation(),
      const UseDenseSpacing(),
      const UseAdaptiveSheet(),
    };
  }
}

/// Policy for dashboard/home screens.
class DashboardAdaptivePolicy extends AdaptivePolicy {
  const DashboardAdaptivePolicy();

  @override
  Set<AdaptiveCapability> capabilitiesFor(LayoutSizeClass sizeClass) {
    final capabilities = <AdaptiveCapability>{
      const UseBottomNavigation(),
      const UseDenseSpacing(),
      const UseAdaptiveSheet(),
    };

    if (sizeClass.isAtLeastMedium) {
      capabilities.addAll({
        const ShowSidebar(),
        const UseNavigationRail(),
        const UseTwoColumns(),
        const UseComfortableSpacing(),
        const UseSideSheet(),
        const UseExpandedAppBar(),
        const UseHoverEffects(),
      });
    }

    if (sizeClass.isAtLeastExpanded) {
      capabilities.addAll({
        const UseThreeColumns(),
        const UseDataTable(),
      });
    }

    return capabilities;
  }
}

/// Provider for the current adaptive policy.
///
/// Can be overridden per-feature (e.g., auth uses AuthAdaptivePolicy).
final adaptivePolicyProvider = Provider<AdaptivePolicy>((ref) {
  return const TmsAdaptivePolicy();
});

/// Provider for the current size class.
final sizeClassProvider = Provider<LayoutSizeClass>((ref) {
  // This will be overridden by a wrapper widget that has BuildContext
  throw UnimplementedError(
      'sizeClassProvider must be overridden with a BuildContext');
});

/// Provider for checking if a capability is available.
final capabilityProvider =
    Provider.family<bool, AdaptiveCapability>((ref, capability) {
  final sizeClass = ref.watch(sizeClassProvider);
  return capability.isAvailableAt(sizeClass);
});

/// Widget that provides the current size class to the provider scope.
class AdaptiveSizeProvider extends ConsumerStatefulWidget {
  const AdaptiveSizeProvider({
    super.key,
    required this.child,
    this.policy,
  });

  final Widget child;
  final AdaptivePolicy? policy;

  @override
  ConsumerState<AdaptiveSizeProvider> createState() =>
      _AdaptiveSizeProviderState();
}

class _AdaptiveSizeProviderState extends ConsumerState<AdaptiveSizeProvider> {
  @override
  Widget build(BuildContext context) {
    final sizeClass = Breakpoints.fromWidth(MediaQuery.sizeOf(context).width);
    final policy = widget.policy ?? const TmsAdaptivePolicy();

    return ProviderScope(
      overrides: [
        sizeClassProvider.overrideWithValue(sizeClass),
        adaptivePolicyProvider.overrideWithValue(policy),
      ],
      child: widget.child,
    );
  }
}
