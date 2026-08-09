import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// The theme used throughout the TMS app, matching the web UI colors.
final ThemeData tmsTheme = ThemeData(
  // Primary brand colour
  primaryColor: const Color(0xFF1560BD),

  // ColorScheme derived from the primary colour
  colorScheme: ColorScheme.fromSeed(
    seedColor: const Color(0xFF1560BD),
    brightness: Brightness.light,
    primary: const Color(0xFF1560BD),
    secondary: const Color(0xFF2F6FED),
    background: const Color(0xFFF5F7FA),
    onBackground: const Color(0xFF1B1F3B),
    onPrimary: Colors.white,
    onSecondary: Colors.white,
    onBackground: const Color(0xFF1B1F3B),
    onError: Colors.redAccent,
    onSecondaryVariant: const Color(0xFFFFBC3B),
  ),

  // Typography – matches the web UI
  textTheme: const TextTheme(
    headline1: GoogleFonts.fraunces(
      fontSize: 24,
      fontWeight: FontWeight.w600,
      color: Color(0xFF1B1F3B),
    ),
    bodyText1: GoogleFonts.roboto(
      fontSize: 16,
      color: Color(0xFF1B1F3B),
    ),
    // Add more text styles as needed
  ),
);