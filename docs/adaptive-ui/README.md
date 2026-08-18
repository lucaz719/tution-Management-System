# TMS Adaptive UI Documentation

## Overview
This document describes the adaptive/responsive UI implementation for TMS based on the **flutter-adaptive-ui** skill principles: constraints-based layouts, breakpoint-driven design, and Capability/Policy patterns.

## Core Principle (from flutter-adaptive-ui skill)

> **Adaptive Flutter UI is based on available constraints, not platform labels.** Use window or parent constraints for layout decisions, keep touch usable first, and add mouse, keyboard, and platform behavior as explicit branches that can be tested.

**Core rule**: Constraints go down, sizes go up, parent sets position.

## Breakpoints (Default from Skill)

| Breakpoint | Width Range | Typical Devices |
|------------|-------------|-----------------|
| **Compact** | width < 600 | Mobile phones |
| **Medium** | 600 ≤ width < 840 | Tablets, small desktop windows |
| **Expanded** | width ≥ 840 | Desktop, large tablets, web |

## Three-Step Workflow (from flutter-adaptive-ui skill)

### Step 1: Abstract
Identify widgets that need adaptability and abstract shared data:
- **Dialogs** (fullscreen vs modal)
- **Navigation UI** (NavigationBar vs NavigationRail)
- **Custom layouts** (tall vs wide)

Create shared models used by both variants:
```dart
class AdaptiveDestination {
  const AdaptiveDestination(this.icon, this.label);
  final IconData icon;
  final String label;
}

static const _destinations = [
  AdaptiveDestination(Icons.home, 'Home'),
  AdaptiveDestination(Icons.search, 'Search'),
  AdaptiveDestination(Icons.person, 'Profile'),
];
```

### Step 2: Measure
Use appropriate measuring technique:

**MediaQuery.sizeOf(context)** - For app-level/window decisions:
```dart
final width = MediaQuery.sizeOf(context).width;
// Rebuilds when window size changes
```

**LayoutBuilder** - For parent-constraint decisions:
```dart
LayoutBuilder(
  builder: (context, constraints) {
    // constraints.maxWidth, constraints.maxHeight
    // Use when branch depends on parent constraints
  },
)
```

### Step 3: Branch
Branch by breakpoints or capabilities, NOT by device type:
```dart
// ❌ WRONG - device-based
if (Platform.isIOS) ...

// ✅ CORRECT - constraint-based
if (width < 600) ... // Compact
else if (width < 840) ... // Medium
else ... // Expanded
```

## Implementation Patterns

### 1. Responsive Navigation (from skill assets)
```dart
class ResponsiveNavigation extends StatefulWidget {
  const ResponsiveNavigation({super.key});

  @override
  State<ResponsiveNavigation> createState() => _ResponsiveNavigationState();
}

class _ResponsiveNavigationState extends State<ResponsiveNavigation> {
  static const _destinations = [
    _AdaptiveDestination(Icons.home, 'Home'),
    _AdaptiveDestination(Icons.search, 'Search'),
    _AdaptiveDestination(Icons.task_alt, 'Tasks'),
    _AdaptiveDestination(Icons.person, 'Profile'),
  ];

  int _selectedIndex = 0;

  void _selectDestination(int index) {
    setState(() => _selectedIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    return width >= 600 ? _buildLargeLayout() : _buildSmallLayout();
  }

  Widget _buildSmallLayout() => Scaffold(
    appBar: AppBar(title: Text(_destinations[_selectedIndex].label)),
    body: _DestinationBody(label: _destinations[_selectedIndex].label),
    bottomNavigationBar: NavigationBar(
      selectedIndex: _selectedIndex,
      onDestinationSelected: _selectDestination,
      destinations: _destinations.map((d) => NavigationDestination(
        icon: Icon(d.icon), label: d.label,
      )).toList(),
    ),
  );

  Widget _buildLargeLayout() => Scaffold(
    body: Row(children: [
      NavigationRail(
        selectedIndex: _selectedIndex,
        onDestinationSelected: _selectDestination,
        labelType: NavigationRailLabelType.all,
        destinations: _destinations.map((d) => NavigationRailDestination(
          icon: Icon(d.icon), label: Text(d.label),
        )).toList(),
      ),
      Expanded(child: _DestinationBody(label: _destinations[_selectedIndex].label)),
    ]),
  );
}
```

### 2. Adaptive Dialogs
```dart
Future<void> showAdaptiveDialog(BuildContext context) async {
  final width = MediaQuery.sizeOf(context).width;
  final isCompact = width < 600;

  if (isCompact) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _buildSheetContent(),
    );
  } else {
    return showDialog(
      context: context,
      builder: (context) => Dialog(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 500),
          child: _buildSheetContent(),
        ),
      ),
    );
  }
}
```

### 3. Adaptive Lists/Grids
```dart
class AdaptiveTaskList extends StatelessWidget {
  final List<Task> tasks;

  const AdaptiveTaskList({super.key, required this.tasks});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final crossAxisCount = constraints.maxWidth >= 840 ? 3 : 
                            constraints.maxWidth >= 600 ? 2 : 1;
      
      return GridView.extent(
        maxCrossAxisExtent: 400,
        children: tasks.map((t) => TaskCard(task: t)).toList(),
      );
    });
  }
}
```

### 4. Constrained Content Widths
```dart
class AdaptivePage extends StatelessWidget {
  final Widget child;

  const AdaptivePage({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final maxContentWidth = constraints.maxWidth >= 840 ? 1200.0 : 
                              constraints.maxWidth >= 600 ? 800.0 : double.infinity;
      
      return Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: maxContentWidth),
          child: child,
        ),
      );
    });
  }
}
```

## Capability & Policy Pattern (from flutter-adaptive-ui skill)

### Capabilities (What IS possible)
```dart
abstract class PlatformCapabilities {
  bool get supportsHover;
  bool get supportsRightClick;
  bool get supportsKeyboardShortcuts;
  bool get supportsDragAndDrop;
  bool get supportsWindowManagement;
}

class DesktopCapabilities implements PlatformCapabilities {
  @override bool get supportsHover => true;
  @override bool get supportsRightClick => true;
  @override bool get supportsKeyboardShortcuts => true;
  @override bool get supportsDragAndDrop => true;
  @override bool get supportsWindowManagement => true;
}

class MobileCapabilities implements PlatformCapabilities {
  @override bool get supportsHover => false;
  @override bool get supportsRightClick => false;
  @override bool get supportsKeyboardShortcuts => false;
  @override bool get supportsDragAndDrop => true;
  @override bool get supportsWindowManagement => false;
}
```

### Policies (What SHOULD be shown/allowed)
```dart
abstract class UIPolicy {
  bool shouldShowHoverEffects(PlatformCapabilities caps);
  bool shouldShowContextMenu(PlatformCapabilities caps);
  bool shouldEnableKeyboardShortcuts(PlatformCapabilities caps);
  int getMaxContentWidth(double availableWidth);
}

class DefaultUIPolicy implements UIPolicy {
  @override
  bool shouldShowHoverEffects(PlatformCapabilities caps) => caps.supportsHover;

  @override
  bool shouldShowContextMenu(PlatformCapabilities caps) => caps.supportsRightClick;

  @override
  bool shouldEnableKeyboardShortcuts(PlatformCapabilities caps) => 
      caps.supportsKeyboardShortcuts;

  @override
  int getMaxContentWidth(double availableWidth) {
    if (availableWidth >= 1200) return 1200;
    if (availableWidth >= 840) return 800;
    if (availableWidth >= 600) return 600;
    return availableWidth.toInt();
  }
}
```

### Usage in Widgets
```dart
class AdaptiveButton extends StatelessWidget {
  final VoidCallback onPressed;
  final Widget child;
  final PlatformCapabilities capabilities;
  final UIPolicy policy;

  const AdaptiveButton({
    super.key,
    required this.onPressed,
    required this.child,
    required this.capabilities,
    required this.policy,
  });

  @override
  Widget build(BuildContext context) {
    final showHover = policy.shouldShowHoverEffects(capabilities);
    
    return showHover 
      ? MouseRegion(
          cursor: SystemMouseCursors.click,
          child: ElevatedButton(onPressed: onPressed, child: child),
        )
      : ElevatedButton(onPressed: onPressed, child: child);
  }
}
```

## State Preservation Across Resize (Critical)

From flutter-adaptive-ui skill: **Keep scroll position, selected navigation, form input, and focus stable across resize/orientation/fold changes.**

```dart
class AdaptiveScaffold extends StatefulWidget {
  final Widget child;
  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;

  const AdaptiveScaffold({
    super.key,
    required this.child,
    required this.selectedIndex,
    required this.onDestinationSelected,
  });

  @override
  State<AdaptiveScaffold> createState() => _AdaptiveScaffoldState();
}

class _AdaptiveScaffoldState extends State<AdaptiveScaffold> {
  // Key to preserve state across layout changes
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey();
  
  // PageStorage to preserve scroll positions
  final PageStorageBucket _bucket = PageStorageBucket();

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    
    return PageStorage(
      bucket: _bucket,
      child: width >= 600 ? _buildLarge() : _buildSmall(),
    );
  }
}
```

## Validation Checklist (from flutter-adaptive-ui skill)

After implementing adaptive UI:

- [ ] Run `flutter analyze`
- [ ] Run relevant widget tests for layout branching, navigation state, focus, policy/capability behavior
- [ ] Manually check: narrow (<600), medium (600-839), expanded (≥840)
- [ ] Verify: no overflow stripes, no clipped text, no lost selected state, no lost scroll position, no broken keyboard traversal
- [ ] If validation cannot run, report blocker and risk

## Anti-Patterns to Avoid (from flutter-adaptive-ui skill)

| ❌ Don't | ✅ Do |
|----------|-------|
| Use `Platform.isIOS/Android` for layout | Use available width/constraints |
| Use `OrientationBuilder` for layout | Use `MediaQuery.sizeOf` or `LayoutBuilder` |
| Let large screens stretch content full width | Use max width or multi-column layouts |
| Lose state on resize | Preserve scroll, selection, focus |
| Duplicate whole screens for expanded | Use local reflow with `GridView.extent` or flex |

## TMS-Specific Adaptive Requirements

### Mobile (< 600)
- Bottom NavigationBar
- Full-screen dialogs as bottom sheets
- Single-column lists
- Touch-first interactions

### Tablet (600-839)
- NavigationRail (collapsed) or NavigationBar
- Two-column layouts where appropriate
- Modal dialogs
- Touch + basic hover

### Desktop/Web (≥ 840)
- Full NavigationRail with labels
- Multi-column grids (2-3 columns)
- Side-by-side layouts (master-detail)
- Hover effects, right-click menus, keyboard shortcuts
- Drag and drop support

## References
- [flutter-adaptive-ui skill](https://github.com/MADTeacher/mad-agents-skills/tree/main/flutter-adaptive-ui)
- [Adaptive Workflow](references/adaptive-workflow.md)
- [Layout Constraints](references/layout-constraints.md)
- [Layout Basics](references/layout-basics.md)
- [Adaptive Best Practices](references/adaptive-best-practices.md)
- [Adaptive Capabilities](references/adaptive-capabilities.md)
- [Responsive Navigation Example](assets/responsive_navigation.dart)
- [Capability/Policy Example](assets/capability_policy_example.dart)