# TMS Wireframes & Prototypes

## Overview
This directory contains wireframes, mockups, and interactive prototypes for the TMS application across all target platforms (mobile, tablet, desktop, web).

## Wireframe Categories

### 1. Mobile Wireframes (< 600px width)

#### Login Screen
```
┌─────────────────────────┐
│                         │
│      TMS Logo           │
│                         │
│  ┌───────────────────┐  │
│  │ Email             │  │
│  ├───────────────────┤  │
│  │ Password          │  │
│  ├───────────────────┤  │
│  │ [Forgot Password?]│  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │    Sign In        │  │
│  └───────────────────┘  │
│                         │
│  Don't have an account? │
│  [Sign Up]              │
│                         │
└─────────────────────────┘
```

#### Task List (Compact)
```
┌─────────────────────────┐
│ TMS          [≡]        │  ← AppBar with menu
├─────────────────────────┤
│ [Search tasks...]       │
├─────────────────────────┤
│ ▢ Task 1        [•••]   │
│    Due: Tomorrow        │
├─────────────────────────┤
│ ▢ Task 2        [•••]   │
│    Due: Friday          │
├─────────────────────────┤
│ ☑ Task 3 (completed)    │
│    Due: Yesterday       │
├─────────────────────────┤
│                         │
│                    [+]  │  ← FAB for new task
└─────────────────────────┘
┌─────────────────────────┐
│ Home  Search  Tasks  Me │  ← Bottom NavigationBar
└─────────────────────────┘
```

#### Task Detail (Mobile)
```
┌─────────────────────────┐
│ ←  Task Details         │
├─────────────────────────┤
│ Task Title              │
├─────────────────────────┤
│ Description             │
│ Lorem ipsum dolor sit   │
│ amet, consectetur...    │
├─────────────────────────┤
│ Due Date: Dec 15, 2024  │
│ Priority: High          │
│ Project: Website        │
├─────────────────────────┤
│ Subtasks:               │
│ ▢ Subtask 1             │
│ ▢ Subtask 2             │
│ ☑ Subtask 3             │
├─────────────────────────┤
│ Comments (3)            │
│ ┌───────────────────┐   │
│ │ Add comment...    │   │
│ └───────────────────┘   │
└─────────────────────────┘
```

#### Create/Edit Task (Bottom Sheet)
```
┌─────────────────────────┐
│          Task           │
├─────────────────────────┤
│ Title *                 │
│ [____________________]  │
├─────────────────────────┤
│ Description             │
│ [____________________]  │
│ [____________________]  │
├─────────────────────────┤
│ Due Date  [📅 Pick]     │
│ Priority  [▼ High ▼]    │
│ Project   [▼ Website ▼] │
├─────────────────────────┤
│      [Cancel] [Save]    │
└─────────────────────────┘
```

---

### 2. Tablet Wireframes (600-839px)

#### Split View - Task List + Detail
```
┌─────────────────────────────────────────────────┐
│ TMS                    [User Avatar]            │
├────────────────┬────────────────────────────────┤
│                │                               │
│  Navigation    │    Task Detail                │
│  Rail          │  ┌─────────────────────────┐  │
│  ┌──────────┐  │  │ Task Title              │  │
│  │ [Home]   │  │  ├─────────────────────────┤  │
│  │ [Search] │  │  │ Description             │  │
│  │ [Tasks]● │  │  │ ...                     │  │
│  │ [Projects]   │  ├─────────────────────────┤  │
│  │ [Settings]   │  │ Due: Dec 15 | High      │  │
│  └──────────┘  │  │ Project: Website        │  │
│                │  ├─────────────────────────┤  │
│                │  │ Subtasks:               │  │
│                │  │ ▢ Subtask 1             │  │
│                │  │ ▢ Subtask 2             │  │
│                │  └─────────────────────────┘  │
└────────────────┴────────────────────────────────┘
```

---

### 3. Desktop/Web Wireframes (≥ 840px)

#### Three-Panel Layout (Master-Detail-Detail)
```
┌─────────────────────────────────────────────────────────────────┐
│ TMS                                    [Search] [Notifications] [≡] │
├────────────┬──────────────────────┬────────────────────────────────┤
│            │                      │                                 │
│ Navigation │    Task List         │      Task Detail Panel          │
│ Rail       │  ┌────────────────┐  │  ┌───────────────────────────┐  │
│ ┌────────┐ │  │ ▢ Task 1       │  │  │ Task Title                │  │
│ │ [Home] │ │  │    Due: Tomorrow     │  ├───────────────────────────┤  │
│ │ [Search] │ │  │ ▢ Task 2       │  │  │ Description               │  │
│ │ [Tasks]● │ │  │    Due: Friday       │  │ ...                       │  │
│ │ [Projects]│ │  │ ☑ Task 3       │  │  ├───────────────────────────┤  │
│ │ [Calendar]│ │  │    Completed         │  │ Due: Dec 15 | High        │  │
│ │ [Team]   │ │  └────────────────┘  │  │ Project: Website          │  │
│ │ [Settings]│ │                      │  ├───────────────────────────┤  │
│ └────────┘ │  [+] New Task          │  │ Subtasks:                 │  │
│            │                      │  │ ▢ Subtask 1     [Edit] [×]  │  │
│            │                      │  │ ▢ Subtask 2     [Edit] [×]  │  │
│            │                      │  │ ☑ Subtask 3     [Edit] [×]  │  │
│            │                      │  │ [+ Add Subtask]             │  │
│            │                      │  ├───────────────────────────┤  │
│            │                      │  │ Comments (3)              │  │
│            │                      │  │ ┌───────────────────────┐  │  │
│            │                      │  │ │ @mention Add comment  │  │  │
│            │                      │  │ └───────────────────────┘  │  │
└────────────┴──────────────────────┴────────────────────────────────┘
```

#### Dashboard View (Expanded)
```
┌─────────────────────────────────────────────────────────────────┐
│ TMS                                    [Search] [Notifications] [≡] │
├────────────┬────────────────────────────────────────────────────────┤
│            │  Welcome back, John!              [Filter ▼] [View ▼]  │
│ Navigation │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│ Rail       │  │ My Tasks     │ │ Team Tasks   │ │ Overdue      │    │
│ ┌────────┐ │  │     12       │ │     8        │ │     3        │    │
│ │ [Home]●│ │  │ [View All]   │ │ [View All]   │ │ [View All]   │    │
│ │ [Inbox]│ │  └──────────────┘ └──────────────┘ └──────────────┘    │
│ │ [Today]│ │                                                    │    │
│ │ [Upcoming]│  ┌────────────────────────────────────────────────┐   │
│ │ [Projects]│  │ Recent Activity                              │   │
│ │ [Calendar]│  │ ┌──────────────────────────────────────────┐   │   │
│ │ [Team]   │  │ │ You completed "Design Review"            │   │   │
│ │ [Reports]│  │ │ 2 hours ago • Website Project             │   │   │
│ │ [Settings]│  │ ├──────────────────────────────────────────┤   │   │
│ └────────┘ │  │ │ Sarah assigned you to "API Integration"  │   │   │
│            │  │ │ 4 hours ago • Mobile App                  │   │   │
│            │  │ └──────────────────────────────────────────┘   │   │
└────────────┴────────────────────────────────────────────────────────┘
```

---

## Interactive Prototypes

### Prototype 1: Responsive Navigation Switcher
Based on the `responsive_navigation.dart` example from flutter-adaptive-ui skill:

```dart
// Key features demonstrated:
// - Breakpoint at 600px
// - NavigationBar (bottom) for compact
// - NavigationRail (side) for expanded
// - Shared destination model
// - State preservation across resize
```

### Prototype 2: Adaptive Dialog Flow
```dart
// Demonstrates:
// - Bottom sheet on mobile (< 600px)
// - Centered dialog on tablet/desktop (≥ 600px)
// - Consistent content, adaptive container
```

### Prototype 3: Adaptive Task Card
```dart
// Demonstrates:
// - Single column on mobile
// - Two-column grid on tablet
// - Three-column grid on desktop
// - Constrained content width on expanded
```

---

## Design Tokens (for consistency)

### Spacing
| Token | Mobile | Tablet | Desktop |
|-------|--------|--------|---------|
| xs    | 4px    | 4px    | 4px     |
| sm    | 8px    | 8px    | 8px     |
| md    | 16px   | 16px   | 16px    |
| lg    | 24px   | 24px   | 24px    |
| xl    | 32px   | 32px   | 32px    |

### Typography
| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Heading 1 | 28px | 32px | 36px |
| Heading 2 | 24px | 28px | 32px |
| Body | 16px | 16px | 16px |
| Caption | 12px | 12px | 12px |

### Breakpoint Tokens
```dart
const double breakpointCompact = 600;
const double breakpointMedium = 840;
const double breakpointExpanded = 1200;
```

---

## Interactive Prototype Links

> **Note**: These are conceptual wireframes. For interactive prototypes, use the Flutter examples from the skills:

1. **Responsive Navigation**: `/mad-agents-skills/flutter-adaptive-ui/assets/responsive_navigation.dart`
2. **Capability/Policy**: `/mad-agents-skills/flutter-adaptive-ui/assets/capability_policy_example.dart`
3. **Animation Examples**: `/mad-agents-skills/flutter-animations/assets/`
4. **Navigation Patterns**: `/mad-agents-skills/flutter-navigation/assets/`

## Figma/Sketch Import Notes

When creating high-fidelity mockups in design tools:

1. **Create frames for each breakpoint**: 375px, 768px, 1024px, 1440px
2. **Use auto-layout** for responsive components
3. **Define component variants** for each breakpoint
4. **Document component states**: default, hover, focus, pressed, disabled
5. **Export specs** for developers with spacing, typography, colors

## Validation Checklist

- [ ] All wireframes cover compact (<600), medium (600-839), expanded (≥840)
- [ ] Navigation pattern documented for each breakpoint
- [ ] State preservation strategy documented
- [ ] Touch targets ≥ 48x48dp on mobile
- [ ] Keyboard navigation documented for desktop
- [ ] Focus order logical for all breakpoints
- [ ] Color contrast meets WCAG AA
- [ ] Text scaling tested up to 200%

## Next Steps

1. **Create high-fidelity mockups** in Figma using these wireframes as base
2. **Build interactive prototypes** in Flutter using the skill examples
3. **Conduct usability testing** at each breakpoint
4. **Document component library** with all variants
5. **Create design tokens file** for developer handoff