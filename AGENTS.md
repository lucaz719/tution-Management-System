# AGENTS.md (Repository)

## What this repo is
TMS (Task Management System) - A cross-platform Flutter application for task management with adaptive UI, offline-first architecture, and multi-platform support.

## Universal Tooling
- Stack: Flutter 3.x, Dart 3.x, Riverpod for state management
- Package/Build System: flutter pub, build_runner, melos for monorepo
- Primary Docs: README.md, docs/

## Commands (if non-standard)
- Build: `flutter build apk --release` / `flutter build ios --release` / `flutter build web`
- Test: `flutter test --coverage` / `melos run test`
- Lint/Format: `flutter analyze` / `dart format .`
- Typecheck: `dart analyze`

## Navigation
If working inside a package/service directory — read that folder's `AGENTS.md`.

## Progressive Disclosure
- Architecture: docs/architecture/README.md
- Adaptive UI: docs/adaptive-ui/README.md
- API/Networking: docs/api/README.md
- Testing: docs/testing/README.md
- Wireframes: docs/wireframes/README.md

## Skills
- flutter-adaptive-ui (external) - Adaptive/responsive layouts
- flutter-architecture (external) - MVVM, feature-first structure
- flutter-animations (external) - Motion and transitions
- flutter-navigation (external) - Routing and deep linking
- flutter-networking (external) - HTTP, WebSocket, auth
- flutter-testing (external) - Unit, widget, integration tests
- agents-md-generator (external) - AGENTS.md maintenance