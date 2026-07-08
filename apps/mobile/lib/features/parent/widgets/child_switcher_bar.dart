import 'package:flutter/material.dart';
import 'package:tms_mobile/core/theme/app_theme.dart';

class ChildSwitcherBar extends StatelessWidget {
  const ChildSwitcherBar({
    super.key,
    required this.childrenNames,
    required this.selectedChild,
    required this.onChanged,
  });

  final List<String> childrenNames;
  final String selectedChild;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: childrenNames.map((child) {
          final selected = child == selectedChild;
          return Padding(
            padding: const EdgeInsets.only(right: 10),
            child: Material(
              color: selected ? kColorPrimary : Colors.white,
              borderRadius: BorderRadius.circular(999),
              child: InkWell(
                borderRadius: BorderRadius.circular(999),
                onTap: () => onChanged(child),
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
