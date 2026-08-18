import 'package:flutter/material.dart';

class TmsAppColors {
  TmsAppColors._();

  static const Color primary = Color(0xFF0F4C8A);
  static const Color primaryLight = Color(0xFF1B5FA7);
  static const Color accent = Color(0xFFF39C12);
  static const Color accentHover = Color(0xFFF7B733);
  static const Color bg = Color(0xFFFFFFFF);
  static const Color surface = Color(0xFFF5F7FA);
  static const Color text = Color(0xFF2C3E50);
  static const Color mutedText = Color(0x9E2C3E50);
  static const Color success = Color(0xFF2E9E5B);
  static const Color warning = Color(0xFFE08E00);
  static const Color error = Color(0xFFD64545);
  static const Color info = Color(0xFF1B5FA7);

  static const Color divider = Color(0xFFE5E9F0);
  static const Color border = Color(0xFFD7DFEA);

  static Color tint(Color color, double opacity) {
    return color.withValues(alpha: opacity);
  }
}
