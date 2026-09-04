import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tms_mobile/core/providers/child_selection_provider.dart';
import 'package:tms_mobile/core/theme/app_theme.dart';

class ChildSwitcherBar extends ConsumerWidget {
  const ChildSwitcherBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedChild = ref.watch(childSelectionProvider);
    final children = ref.watch(availableChildrenProvider);

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: children.map((child) {
          final selected = child == selectedChild;
          return Padding(
            padding: const EdgeInsets.only(right: 10),
            child: Material(
              color: selected ? kColorPrimary : Colors.white,
              borderRadius: BorderRadius.circular(999),
              child: InkWell(
                borderRadius: BorderRadius.circular(999),
                onTap: () => ref.read(childSelectionProvider.notifier).selectChild(child),
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  child: Text(
                    child,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: selected ? Colors.white : kColorText,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
