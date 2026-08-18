# TMS UI Design System Documentation

## Overview
This document describes the UI design system for TMS, including components, design tokens, theming, and responsive patterns based on the **flutter-adaptive-ui** and **flutter-animations** skills.

## Design Tokens

### Colors
```dart
class TMSColors {
  // Primary
  static const primary = Color(0xFF2563EB);      // Blue 600
  static const primaryContainer = Color(0xFFDBEAFE); // Blue 50
  static const onPrimary = Color(0xFFFFFFFF);
  static const onPrimaryContainer = Color(0xFF1E3A8A); // Blue 900
  
  // Secondary
  static const secondary = Color(0xFF7C3AED);    // Violet 600
  static const secondaryContainer = Color(0xFFEDE9FE); // Violet 50
  static const onSecondary = Color(0xFFFFFFFF);
  static const onSecondaryContainer = Color(0xFF4C1D95); // Violet 900
  
  // Tertiary
  static const tertiary = Color(0xFF059669);     // Emerald 600
  static const tertiaryContainer = Color(0xFFD1FAE5); // Emerald 50
  static const onTertiary = Color(0xFFFFFFFF);
  static const onTertiaryContainer = Color(0xFF064E3B); // Emerald 900
  
  // Surface
  static const surface = Color(0xFFFFFFFF);
  static const surfaceVariant = Color(0xFFF3F4F6); // Gray 100
  static const onSurface = Color(0xFF111827);    // Gray 900
  static const onSurfaceVariant = Color(0xFF4B5563); // Gray 600
  
  // Background
  static const background = Color(0xFFFAFAFA);
  static const onBackground = Color(0xFF111827);
  
  // Error
  static const error = Color(0xFFDC2626);        // Red 600
  static const errorContainer = Color(0xFFFEF2F2);
  static const onError = Color(0xFFFFFFFF);
  static const onErrorContainer = Color(0xFF7F1D1D);
  
  // Outline
  static const outline = Color(0xFFD1D5DB);      // Gray 300
  static const outlineVariant = Color(0xFFE5E7EB); // Gray 200
  
  // Priority Colors
  static const priorityLow = Color(0xFF22C55E);    // Green 500
  static const priorityMedium = Color(0xFFF59E0B); // Amber 500
  static const priorityHigh = Color(0xFFEF4444);   // Red 500
  static const priorityUrgent = Color(0xFF7C3AED); // Violet 600
  
  // Status Colors
  static const statusTodo = Color(0xFF9CA3AF);     // Gray 400
  static const statusInProgress = Color(0xFF3B82F6); // Blue 500
  static const statusReview = Color(0xFFF59E0B);   // Amber 500
  static const statusDone = Color(0xFF22C55E);     // Green 500
}
```

### Dark Theme Colors
```dart
class TMSDarkColors {
  static const primary = Color(0xFF60A5FA);      // Blue 400
  static const primaryContainer = Color(0xFF1E3A8A); // Blue 900
  static const onPrimary = Color(0xFF1E3A8A);
  static const onPrimaryContainer = Color(0xFFDBEAFE);
  
  static const secondary = Color(0xFFA78BFA);    // Violet 400
  static const secondaryContainer = Color(0xFF4C1D95); // Violet 900
  static const onSecondary = Color(0xFF4C1D95);
  static const onSecondaryContainer = Color(0xFFEDE9FE);
  
  static const surface = Color(0xFF1F2937);      // Gray 800
  static const surfaceVariant = Color(0xFF374151); // Gray 700
  static const onSurface = Color(0xFFF9FAFB);    // Gray 50
  static const onSurfaceVariant = Color(0xFFD1D5DB); // Gray 300
  
  static const background = Color(0xFF111827);   // Gray 900
  static const onBackground = Color(0xFFF9FAFB);
  
  static const error = Color(0xFFF87171);        // Red 400
  static const errorContainer = Color(0xFF7F1D1D);
  static const onError = Color(0xFF7F1D1D);
  static const onErrorContainer = Color(0xFFFEF2F2);
  
  static const outline = Color(0xFF4B5563);      // Gray 600
  static const outlineVariant = Color(0xFF374151); // Gray 700
}
```

### Typography
```dart
class TMSTypography {
  static const displayLarge = TextStyle(
    fontSize: 57, fontWeight: FontWeight.w400, letterSpacing: -0.25,
  );
  static const displayMedium = TextStyle(
    fontSize: 45, fontWeight: FontWeight.w400,
  );
  static const displaySmall = TextStyle(
    fontSize: 36, fontWeight: FontWeight.w400,
  );
  
  static const headlineLarge = TextStyle(
    fontSize: 32, fontWeight: FontWeight.w600,
  );
  static const headlineMedium = TextStyle(
    fontSize: 28, fontWeight: FontWeight.w600,
  );
  static const headlineSmall = TextStyle(
    fontSize: 24, fontWeight: FontWeight.w600,
  );
  
  static const titleLarge = TextStyle(
    fontSize: 22, fontWeight: FontWeight.w500, letterSpacing: 0,
  );
  static const titleMedium = TextStyle(
    fontSize: 16, fontWeight: FontWeight.w500, letterSpacing: 0.15,
  );
  static const titleSmall = TextStyle(
    fontSize: 14, fontWeight: FontWeight.w500, letterSpacing: 0.1,
  );
  
  static const bodyLarge = TextStyle(
    fontSize: 16, fontWeight: FontWeight.w400, letterSpacing: 0.5,
  );
  static const bodyMedium = TextStyle(
    fontSize: 14, fontWeight: FontWeight.w400, letterSpacing: 0.25,
  );
  static const bodySmall = TextStyle(
    fontSize: 12, fontWeight: FontWeight.w400, letterSpacing: 0.4,
  );
  
  static const labelLarge = TextStyle(
    fontSize: 14, fontWeight: FontWeight.w500, letterSpacing: 0.1,
  );
  static const labelMedium = TextStyle(
    fontSize: 12, fontWeight: FontWeight.w500, letterSpacing: 0.5,
  );
  static const labelSmall = TextStyle(
    fontSize: 11, fontWeight: FontWeight.w500, letterSpacing: 0.5,
  );
}
```

### Spacing System
```dart
class TMSSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;
  
  // Semantic spacing
  static const double screenPadding = md;
  static const double cardPadding = md;
  static const double sectionGap = lg;
  static const double componentGap = md;
  static const double inlineGap = sm;
}
```

### Border Radius
```dart
class TMSRadius {
  static const double none = 0;
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double full = 9999;
}
```

### Shadows
```dart
class TMSShadows {
  static const List<BoxShadow> level0 = [];
  static const List<BoxShadow> level1 = [
    BoxShadow(color: Color(0x1A000000), blurRadius: 2, offset: Offset(0, 1)),
  ];
  static const List<BoxShadow> level2 = [
    BoxShadow(color: Color(0x1A000000), blurRadius: 8, offset: Offset(0, 2)),
  ];
  static const List<BoxShadow> level3 = [
    BoxShadow(color: Color(0x1A000000), blurRadius: 16, offset: Offset(0, 4)),
  ];
  static const List<BoxShadow> level4 = [
    BoxShadow(color: Color(0x1A000000), blurRadius: 24, offset: Offset(0, 8)),
  ];
}
```

## Component Library

### Buttons
```dart
// Primary Button
class TMSPrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;
  final bool fullWidth;
  
  const TMSPrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
    this.icon,
    this.fullWidth = false,
  });
  
  @override
  Widget build(BuildContext context) {
    final child = isLoading
      ? const SizedBox(
          height: 20, width: 20,
          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
        )
      : Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[Icon(icon, size: 18), const SizedBox(width: 8)],
            Text(label, style: TMSTypography.labelLarge.copyWith(color: TMSColors.onPrimary)),
          ],
        );
    
    return SizedBox(
      width: fullWidth ? double.infinity : null,
      child: FilledButton(
        onPressed: isLoading ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: TMSColors.primary,
          foregroundColor: TMSColors.onPrimary,
          padding: const EdgeInsets.symmetric(horizontal: TMSSpacing.lg, vertical: TMSSpacing.md),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(TMSRadius.md)),
        ),
        child: child,
      ),
    );
  }
}

// Secondary Button
class TMSSecondaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool fullWidth;
  
  const TMSSecondaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.fullWidth = false,
  });
  
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: fullWidth ? double.infinity : null,
      child: FilledButton.tonal(
        onPressed: onPressed,
        style: FilledButton.tonalStyleFrom(
          backgroundColor: TMSColors.secondaryContainer,
          foregroundColor: TMSColors.onSecondaryContainer,
          padding: const EdgeInsets.symmetric(horizontal: TMSSpacing.lg, vertical: TMSSpacing.md),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(TMSRadius.md)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[Icon(icon, size: 18), const SizedBox(width: 8)],
            Text(label, style: TMSTypography.labelLarge),
          ],
        ),
      ),
    );
  }
}

// Outlined Button
class TMSOutlinedButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool fullWidth;
  final bool isDestructive;
  
  const TMSOutlinedButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.fullWidth = false,
    this.isDestructive = false,
  });
  
  @override
  Widget build(BuildContext context) {
    final color = isDestructive ? TMSColors.error : TMSColors.primary;
    final bgColor = isDestructive ? TMSColors.errorContainer : TMSColors.primaryContainer;
    
    return SizedBox(
      width: fullWidth ? double.infinity : null,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: color,
          side: BorderSide(color: color, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: TMSSpacing.lg, vertical: TMSSpacing.md),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(TMSRadius.md)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[Icon(icon, size: 18), const SizedBox(width: 8)],
            Text(label, style: TMSTypography.labelLarge.copyWith(color: color)),
          ],
        ),
      ),
    );
  }
}
```

### Cards
```dart
class TMSCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;
  final Color? backgroundColor;
  final List<BoxShadow>? shadows;
  final BorderRadius? borderRadius;
  
  const TMSCard({
    super.key,
    required this.child,
    this.padding,
    this.onTap,
    this.backgroundColor,
    this.shadows,
    this.borderRadius,
  });
  
  @override
  Widget build(BuildContext context) {
    final card = Container(
      padding: padding ?? EdgeInsets.all(TMSSpacing.md),
      decoration: BoxDecoration(
        color: backgroundColor ?? TMSColors.surface,
        borderRadius: borderRadius ?? BorderRadius.circular(TMSRadius.lg),
        boxShadow: shadows ?? TMSShadows.level1,
        border: Border.all(color: TMSColors.outlineVariant, width: 1),
      ),
      child: child,
    );
    
    if (onTap != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: borderRadius ?? BorderRadius.circular(TMSRadius.lg),
        child: card,
      );
    }
    return card;
  }
}

// Task Card
class TMSTaskCard extends StatelessWidget {
  final Task task;
  final VoidCallback? onTap;
  final VoidCallback? onMenuTap;
  
  const TMSTaskCard({
    super.key,
    required this.task,
    this.onTap,
    this.onMenuTap,
  });
  
  @override
  Widget build(BuildContext context) {
    return TMSCard(
      onTap: onTap,
      padding: EdgeInsets.all(TMSSpacing.md),
      child: Row(
        children: [
          // Checkbox
          Checkbox(
            value: task.status == TaskStatus.done,
            onChanged: (_) {}, // Handled by parent
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
          ),
          const SizedBox(width: TMSSpacing.sm),
          
          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        task.title,
                        style: TMSTypography.titleMedium.copyWith(
                          decoration: task.status == TaskStatus.done 
                            ? TextDecoration.lineThrough : null,
                          color: task.status == TaskStatus.done 
                            ? TMSColors.onSurfaceVariant : TMSColors.onSurface,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    // Priority indicator
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: _getPriorityColor(task.priority),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ],
                ),
                if (task.description != null && task.description!.isNotEmpty) ...[
                  const SizedBox(height: TMSSpacing.xs),
                  Text(
                    task.description!,
                    style: TMSTypography.bodySmall.copyWith(color: TMSColors.onSurfaceVariant),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: TMSSpacing.xs),
                // Meta info
                Row(
                  children: [
                    if (task.dueDate != null) ...[
                      Icon(Icons.calendar_today, size: 12, color: TMSColors.onSurfaceVariant),
                      const SizedBox(width: 4),
                      Text(
                        _formatDueDate(task.dueDate!),
                        style: TMSTypography.labelSmall.copyWith(color: TMSColors.onSurfaceVariant),
                      ),
                      const SizedBox(width: TMSSpacing.sm),
                    ],
                    if (task.projectId != null) ...[
                      Icon(Icons.folder, size: 12, color: TMSColors.onSurfaceVariant),
                      const SizedBox(width: 4),
                      Text(
                        task.projectId!,
                        style: TMSTypography.labelSmall.copyWith(color: TMSColors.onSurfaceVariant),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          
          // Menu
          if (onMenuTap != null)
            IconButton(
              icon: const Icon(Icons.more_vert),
              onPressed: onMenuTap,
              color: TMSColors.onSurfaceVariant,
            ),
        ],
      ),
    );
  }
  
  Color _getPriorityColor(TaskPriority priority) {
    switch (priority) {
      case TaskPriority.low: return TMSColors.priorityLow;
      case TaskPriority.medium: return TMSColors.priorityMedium;
      case TaskPriority.high: return TMSColors.priorityHigh;
      case TaskPriority.urgent: return TMSColors.priorityUrgent;
    }
  }
  
  String _formatDueDate(DateTime date) {
    final now = DateTime.now();
    final diff = date.difference(now).inDays;
    if (diff < 0) return 'Overdue';
    if (diff == 0) return 'Today';
    if (diff == 1) return 'Tomorrow';
    return '${diff}d left';
  }
}
```

### Input Fields
```dart
class TMSTextField extends StatelessWidget {
  final String label;
  final String? hint;
  final TextEditingController? controller;
  final String? Function(String?)? validator;
  final TextInputType keyboardType;
  final bool obscureText;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final bool enabled;
  final int? maxLines;
  final int? maxLength;
  
  const TMSTextField({
    super.key,
    required this.label,
    this.hint,
    this.controller,
    this.validator,
    this.keyboardType = TextInputType.text,
    this.obscureText = false,
    this.prefixIcon,
    this.suffixIcon,
    this.enabled = true,
    this.maxLines = 1,
    this.maxLength,
  });
  
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TMSTypography.labelMedium.copyWith(color: TMSColors.onSurface)),
        const SizedBox(height: TMSSpacing.xs),
        TextFormField(
          controller: controller,
          validator: validator,
          keyboardType: keyboardType,
          obscureText: obscureText,
          enabled: enabled,
          maxLines: maxLines,
          maxLength: maxLength,
          style: TMSTypography.bodyLarge,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TMSTypography.bodyMedium.copyWith(color: TMSColors.onSurfaceVariant),
            prefixIcon: prefixIcon,
            suffixIcon: suffixIcon,
            filled: true,
            fillColor: TMSColors.surfaceVariant,
            contentPadding: EdgeInsets.symmetric(
              horizontal: TMSSpacing.md,
              vertical: TMSSpacing.md,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(TMSRadius.md),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(TMSRadius.md),
              borderSide: BorderSide(color: TMSColors.outlineVariant),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(TMSRadius.md),
              borderSide: BorderSide(color: TMSColors.primary, width: 2),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(TMSRadius.md),
              borderSide: BorderSide(color: TMSColors.error, width: 1.5),
            ),
            disabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(TMSRadius.md),
              borderSide: BorderSide(color: TMSColors.outlineVariant),
            ),
            prefixIconColor: TMSColors.onSurfaceVariant,
            suffixIconColor: TMSColors.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}
```

### Chips & Badges
```dart
class TMSChip extends StatelessWidget {
  final String label;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? labelColor;
  final VoidCallback? onDeleted;
  final bool selected;
  
  const TMSChip({
    super.key,
    required this.label,
    this.icon,
    this.backgroundColor,
    this.labelColor,
    this.onDeleted,
    this.selected = false,
  });
  
  @override
  Widget build(BuildContext context) {
    final bgColor = backgroundColor ?? (selected ? TMSColors.primaryContainer : TMSColors.surfaceVariant);
    final lblColor = labelColor ?? (selected ? TMSColors.onPrimaryContainer : TMSColors.onSurface);
    
    return FilterChip(
      label: Text(label, style: TMSTypography.labelMedium.copyWith(color: lblColor)),
      avatar: icon != null ? Icon(icon, size: 16, color: lblColor) : null,
      selected: selected,
      onSelected: (_) {},
      onDeleted: onDeleted,
      selectedColor: TMSColors.primaryContainer,
      backgroundColor: TMSColors.surfaceVariant,
      labelStyle: TMSTypography.labelMedium.copyWith(color: lblColor),
      side: BorderSide(color: TMSColors.outlineVariant),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(TMSRadius.full)),
      padding: EdgeInsets.symmetric(horizontal: TMSSpacing.sm, vertical: TMSSpacing.xs),
      deleteIconColor: TMSColors.onSurfaceVariant,
    );
  }
}

class TMSPriorityBadge extends StatelessWidget {
  final TaskPriority priority;
  final bool showLabel;
  
  const TMSPriorityBadge({
    super.key,
    required this.priority,
    this.showLabel = true,
  });
  
  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (priority) {
      TaskPriority.low => (TMSColors.priorityLow, 'Low'),
      TaskPriority.medium => (TMSColors.priorityMedium, 'Medium'),
      TaskPriority.high => (TMSColors.priorityHigh, 'High'),
      TaskPriority.urgent => (TMSColors.priorityUrgent, 'Urgent'),
    };
    
    return Container(
      padding: EdgeInsets.symmetric(horizontal: TMSSpacing.sm, vertical: TMSSpacing.xs),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(TMSRadius.full),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          if (showLabel) ...[
            const SizedBox(width: TMSSpacing.xs),
            Text(
              label,
              style: TMSTypography.labelSmall.copyWith(
                color: color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
```

## Theming

### Theme Data
```dart
class TMSTheme {
  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    colorScheme: const ColorScheme.light(
      primary: TMSColors.primary,
      primaryContainer: TMSColors.primaryContainer,
      onPrimary: TMSColors.onPrimary,
      onPrimaryContainer: TMSColors.onPrimaryContainer,
      secondary: TMSColors.secondary,
      secondaryContainer: TMSColors.secondaryContainer,
      onSecondary: TMSColors.onSecondary,
      onSecondaryContainer: TMSColors.onSecondaryContainer,
      tertiary: TMSColors.tertiary,
      tertiaryContainer: TMSColors.tertiaryContainer,
      onTertiary: TMSColors.onTertiary,
      onTertiaryContainer: TMSColors.onTertiaryContainer,
      surface: TMSColors.surface,
      surfaceVariant: TMSColors.surfaceVariant,
      onSurface: TMSColors.onSurface,
      onSurfaceVariant: TMSColors.onSurfaceVariant,
      background: TMSColors.background,
      onBackground: TMSColors.onBackground,
      error: TMSColors.error,
      errorContainer: TMSColors.errorContainer,
      onError: TMSColors.onError,
      onErrorContainer: TMSColors.onErrorContainer,
      outline: TMSColors.outline,
      outlineVariant: TMSColors.outlineVariant,
    ),
    textTheme: const TextTheme(
      displayLarge: TMSTypography.displayLarge,
      displayMedium: TMSTypography.displayMedium,
      displaySmall: TMSTypography.displaySmall,
      headlineLarge: TMSTypography.headlineLarge,
      headlineMedium: TMSTypography.headlineMedium,
      headlineSmall: TMSTypography.headlineSmall,
      titleLarge: TMSTypography.titleLarge,
      titleMedium: TMSTypography.titleMedium,
      titleSmall: TMSTypography.titleSmall,
      bodyLarge: TMSTypography.bodyLarge,
      bodyMedium: TMSTypography.bodyMedium,
      bodySmall: TMSTypography.bodySmall,
      labelLarge: TMSTypography.labelLarge,
      labelMedium: TMSTypography.labelMedium,
      labelSmall: TMSTypography.labelSmall,
    ),
    cardTheme: CardTheme(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(TMSRadius.lg)),
      color: TMSColors.surface,
      surfaceTintColor: Colors.transparent,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: TMSColors.primary,
        foregroundColor: TMSColors.onPrimary,
        padding: EdgeInsets.symmetric(horizontal: TMSSpacing.lg, vertical: TMSSpacing.md),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(TMSRadius.md)),
        textStyle: TMSTypography.labelLarge,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: TMSColors.primary,
        padding: EdgeInsets.symmetric(horizontal: TMSSpacing.lg, vertical: TMSSpacing.md),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(TMSRadius.md)),
        textStyle: TMSTypography.labelLarge,
        side: BorderSide(color: TMSColors.primary, width: 1.5),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: TMSColors.surfaceVariant,
      contentPadding: EdgeInsets.symmetric(horizontal: TMSSpacing.md, vertical: TMSSpacing.md),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(TMSRadius.md),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(TMSRadius.md),
        borderSide: BorderSide(color: TMSColors.outlineVariant),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(TMSRadius.md),
        borderSide: BorderSide(color: TMSColors.primary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(TMSRadius.md),
        borderSide: BorderSide(color: TMSColors.error, width: 1.5),
      ),
      hintStyle: TMSTypography.bodyMedium.copyWith(color: TMSColors.onSurfaceVariant),
      labelStyle: TMSTypography.labelMedium.copyWith(color: TMSColors.onSurface),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: TMSColors.surfaceVariant,
      selectedColor: TMSColors.primaryContainer,
      labelStyle: TMSTypography.labelMedium,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(TMSRadius.full)),
      side: BorderSide(color: TMSColors.outlineVariant),
      padding: EdgeInsets.symmetric(horizontal: TMSSpacing.sm, vertical: TMSSpacing.xs),
    ),
    dividerTheme: DividerThemeData(
      color: TMSColors.outlineVariant,
      thickness: 1,
      space: TMSSpacing.lg,
    ),
  );
  
  static ThemeData get darkTheme => ThemeData(
    useMaterial3: true,
    colorScheme: const ColorScheme.dark(
      primary: TMSDarkColors.primary,
      primaryContainer: TMSDarkColors.primaryContainer,
      onPrimary: TMSDarkColors.onPrimary,
      onPrimaryContainer: TMSDarkColors.onPrimaryContainer,
      secondary: TMSDarkColors.secondary,
      secondaryContainer: TMSDarkColors.secondaryContainer,
      onSecondary: TMSDarkColors.onSecondary,
      onSecondaryContainer: TMSDarkColors.onSecondaryContainer,
      surface: TMSDarkColors.surface,
      surfaceVariant: TMSDarkColors.surfaceVariant,
      onSurface: TMSDarkColors.onSurface,
      onSurfaceVariant: TMSDarkColors.onSurfaceVariant,
      background: TMSDarkColors.background,
      onBackground: TMSDarkColors.onBackground,
      error: TMSDarkColors.error,
      errorContainer: TMSDarkColors.errorContainer,
      onError: TMSDarkColors.onError,
      onErrorContainer: TMSDarkColors.onErrorContainer,
      outline: TMSDarkColors.outline,
      outlineVariant: TMSDarkColors.outlineVariant,
    ),
    textTheme: const TextTheme(
      displayLarge: TMSTypography.displayLarge,
      displayMedium: TMSTypography.displayMedium,
      displaySmall: TMSTypography.displaySmall,
      headlineLarge: TMSTypography.headlineLarge,
      headlineMedium: TMSTypography.headlineMedium,
      headlineSmall: TMSTypography.headlineSmall,
      titleLarge: TMSTypography.titleLarge,
      titleMedium: TMSTypography.titleMedium,
      titleSmall: TMSTypography.titleSmall,
      bodyLarge: TMSTypography.bodyLarge,
      bodyMedium: TMSTypography.bodyMedium,
      bodySmall: TMSTypography.bodySmall,
      labelLarge: TMSTypography.labelLarge,
      labelMedium: TMSTypography.labelMedium,
      labelSmall: TMSTypography.labelSmall,
    ).apply(
      bodyColor: TMSDarkColors.onSurface,
      displayColor: TMSDarkColors.onSurface,
    ),
    cardTheme: CardTheme(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(TMSRadius.lg)),
      color: TMSDarkColors.surface,
      surfaceTintColor: Colors.transparent,
    ),
    // ... other themes adapted for dark
  );
}
```

## Animations (from flutter-animations skill)

### Page Transitions
```dart
class TMSPageTransitions {
  // Fade + Slide
  static PageRouteBuilder<T> fadeSlide<T>({
    required Widget page,
    Duration duration = const Duration(milliseconds: 300),
    Curve curve = Curves.easeOutCubic,
  }) {
    return PageRouteBuilder<T>(
      pageBuilder: (_, __, ___) => page,
      transitionDuration: duration,
      transitionsBuilder: (_, animation, __, child) {
        return FadeTransition(
          opacity: animation,
          child: SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0.1, 0),
              end: Offset.zero,
            ).animate(CurvedAnimation(parent: animation, curve: curve)),
            child: child,
          ),
        );
      },
    );
  }
  
  // Shared Element (Hero)
  static PageRouteBuilder<T> hero<T>({
    required Widget page,
    Duration duration = const Duration(milliseconds: 400),
  }) {
    return PageRouteBuilder<T>(
      pageBuilder: (_, __, ___) => page,
      transitionDuration: duration,
      transitionsBuilder: (_, animation, __, child) {
        return FadeTransition(opacity: animation, child: child);
      },
    );
  }
}
```

### Micro-interactions
```dart
class TMSAnimations {
  // Button press
  static Widget scaleOnTap({
    required Widget child,
    required VoidCallback onTap,
    double scale = 0.95,
    Duration duration = const Duration(milliseconds: 100),
  }) {
    return GestureDetector(
      onTapDown: (_) => _animateScale(child, scale, duration),
      onTapUp: (_) => _animateScale(child, 1.0, duration),
      onTapCancel: () => _animateScale(child, 1.0, duration),
      onTap: onTap,
      child: child,
    );
  }
  
  // Fade in/out
  static Widget fadeIn({
    required Widget child,
    Duration duration = const Duration(milliseconds: 300),
    Curve curve = Curves.easeOut,
    double begin = 0.0,
  }) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: begin, end: 1.0),
      duration: duration,
      curve: curve,
      builder: (_, value, child) => Opacity(opacity: value, child: child),
      child: child,
    );
  }
  
  // Staggered list animation
  static Widget staggeredList({
    required List<Widget> children,
    Duration delay = const Duration(milliseconds: 100),
    Duration duration = const Duration(milliseconds: 400),
  }) {
    return Column(
      children: children.asMap().entries.map((entry) {
        final index = entry.key;
        final child = entry.value;
        return TweenAnimationBuilder<double>(
          tween: Tween(begin: 0.0, end: 1.0),
          duration: duration,
          curve: Curves.easeOutCubic,
          builder: (_, value, child) => Transform.translate(
            offset: Offset(0, 20 * (1 - value)),
            child: Opacity(opacity: value, child: child),
          ),
          child: child,
        );
      }).toList(),
    );
  }
}
```

## Responsive Patterns (from flutter-adaptive-ui skill)

### Breakpoint Helpers
```dart
class TMSBreakpoints {
  static bool isCompact(BuildContext context) => 
    MediaQuery.sizeOf(context).width < 600;
  static bool isMedium(BuildContext context) => 
    MediaQuery.sizeOf(context).width >= 600 && MediaQuery.sizeOf(context).width < 840;
  static bool isExpanded(BuildContext context) => 
    MediaQuery.sizeOf(context).width >= 840;
  
  static T responsive<T>(BuildContext context, {
    required T compact,
    T? medium,
    required T expanded,
  }) {
    final width = MediaQuery.sizeOf(context).width;
    if (width < 600) return compact;
    if (width < 840) return medium ?? compact;
    return expanded;
  }
}
```

### Adaptive Layout Widgets
```dart
class TMSAdaptiveLayout extends StatelessWidget {
  final Widget compact;
  final Widget? medium;
  final Widget expanded;
  
  const TMSAdaptiveLayout({
    super.key,
    required this.compact,
    this.medium,
    required this.expanded,
  });
  
  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < 600) return compact;
        if (constraints.maxWidth < 840) return medium ?? compact;
        return expanded;
      },
    );
  }
}

class TMSAdaptiveScaffold extends StatelessWidget {
  final Widget body;
  final PreferredSizeWidget? appBar;
  final Widget? bottomNavigationBar;
  final Widget? navigationRail;
  final Widget? floatingActionButton;
  
  const TMSAdaptiveScaffold({
    super.key,
    required this.body,
    this.appBar,
    this.bottomNavigationBar,
    this.navigationRail,
    this.floatingActionButton,
  });
  
  @override
  Widget build(BuildContext context) {
    return TMSBreakpoints.responsive(
      context,
      compact: Scaffold(
        appBar: appBar,
        body: body,
        bottomNavigationBar: bottomNavigationBar,
        floatingActionButton: floatingActionButton,
      ),
      expanded: Scaffold(
        appBar: appBar,
        body: Row(
          children: [
            if (navigationRail != null) navigationRail!,
            Expanded(child: body),
          ],
        ),
        floatingActionButton: floatingActionButton,
      ),
    );
  }
}
```

## References
- [flutter-adaptive-ui skill](https://github.com/MADTeacher/mad-agents-skills/tree/main/flutter-adaptive-ui)
- [flutter-animations skill](https://github.com/MADTeacher/mad-agents-skills/tree/main/flutter-animations)
- [Material 3 Design System](https://m3.material.io/)