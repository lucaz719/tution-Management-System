# AGENTS.md (Module: tms_mobile)

## What this module is
TMS Mobile - The Flutter mobile application for task management with adaptive UI supporting mobile, tablet, and desktop form factors.

## Tooling
- Stack: Flutter 3.x, Dart 3.x, Riverpod 2.x
- Build System: flutter pub, build_runner

## Commands
- Build: `flutter build apk --release` / `flutter build ios --release` / `flutter build windows` / `flutter build macos` / `flutter build linux`
- Test: `flutter test --coverage`
- Run/Dev: `flutter run -d <device_id>`
- Lint/Format: `flutter analyze` / `dart format .`

## References
- Local Docs: ../docs/adaptive-ui/README.md, ../docs/architecture/README.md
- APIs/Contracts: ../docs/api/README.md

## Skills
- flutter-adaptive-ui (external) - Adaptive/responsive layouts for mobile/tablet/desktop
- flutter-architecture (external) - MVVM with feature-first structure
- flutter-animations (external) - Page transitions and micro-interactions
- flutter-navigation (external) - go_router with deep linking
- flutter-networking (external) - HTTP/REST with Riverpod
- flutter-testing (external) - Unit, widget, integration tests