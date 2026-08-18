# TMS Testing Documentation

## Overview
This document describes the testing strategy for TMS based on the **flutter-testing** skill principles: test pyramid, unit/widget/integration tests, and best practices.

## Test Pyramid (from flutter-testing skill)

```
        /\
       /  \     Integration Tests (Few)
      /____\    - Full user flows
     /      \   - Multiple screens
    /________\  - Performance profiling
   /          \
  /            \ Widget Tests (More)
 /______________\ - UI widget testing
/                \ - User interactions
 \              / - Different orientations
  \____________/ - State changes
   \          /
    \________/  Unit Tests (Most)
               - Individual functions/classes
               - Mock external dependencies
               - Fast execution
```

## Test Distribution Target

| Test Type | Target % | Confidence | Maintenance | Speed |
|-----------|----------|------------|-------------|-------|
| Unit | 70% | Low | Low | Quick |
| Widget | 20% | Higher | Higher | Quick |
| Integration | 10% | Highest | Highest | Slow |

## Unit Testing (from flutter-testing skill)

### When to Use
- Testing individual functions/methods/classes
- Business logic, utilities, data transformations
- ViewModel logic, repository logic

### Example: ViewModel Test
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:tms/features/tasks/presentation/view_models/task_view_model.dart';

class MockTaskRepository extends Mock implements TaskRepository {}

void main() {
  group('TaskViewModel', () {
    late TaskViewModel viewModel;
    late MockTaskRepository mockRepo;
    
    setUp(() {
      mockRepo = MockTaskRepository();
      viewModel = TaskViewModel(mockRepo);
    });
    
    test('loadTasks emits loading then loaded state', () async {
      // Arrange
      final tasks = [Task(id: '1', title: 'Test')];
      when(() => mockRepo.watchTasks()).thenAnswer((_) => Stream.value(tasks));
      
      // Act
      viewModel.loadTasks();
      
      // Assert
      expect(viewModel.state, equals(TaskState.loading()));
      await expectLater(
        viewModel.state,
        emitsInOrder([equals(TaskState.loading()), equals(TaskState.loaded(tasks))]),
      );
    });
    
    test('createTask calls repository and updates state', () async {
      // Arrange
      final newTask = Task(id: '2', title: 'New Task');
      when(() => mockRepo.createTask(any())).thenAnswer((_) async => Success(newTask));
      
      // Act
      await viewModel.createTask('New Task');
      
      // Assert
      verify(() => mockRepo.createTask(any())).called(1);
    });
  });
}
```

### Example: Repository Test
```dart
void main() {
  group('TaskRepositoryImpl', () {
    late TaskRepositoryImpl repo;
    late MockHttpService mockHttp;
    late MockLocalDataSource mockLocal;
    
    setUp(() {
      mockHttp = MockHttpService();
      mockLocal = MockLocalDataSource();
      repo = TaskRepositoryImpl(mockHttp, mockLocal);
    });
    
    test('fetchTasks parses JSON correctly', () async {
      // Arrange
      final json = {'data': [{'id': '1', 'title': 'Task 1'}]};
      when(() => mockHttp.get<Map<String, dynamic>>('/tasks', query: any()))
          .thenAnswer((_) async => Success(json));
      
      // Act
      final result = await repo.fetchTasks();
      
      // Assert
      expect(result.isSuccess, true);
      expect(result.value?.length, 1);
      expect(result.value?.first.title, 'Task 1');
    });
  });
}
```

### Mocking Dependencies (from flutter-testing skill)
```dart
// Using mocktail for mocking
class MockTaskRepository extends Mock implements TaskRepository {}

// For platform channels
TestWidgetsFlutterBinding.ensureInitialized();
const MethodChannel('plugins.flutter.io/shared_preferences')
    .setMockMethodCallHandler((call) async {
  if (call.method == 'getAll') return <String, dynamic>{};
  return null;
});

// For plugins with native code
// Use integration_test for plugin testing
```

## Widget Testing (from flutter-testing skill)

### When to Use
- Testing UI widgets in isolation
- Verifying user interactions (tap, scroll, input)
- Testing different orientations
- Validating state changes

### Example: Task Card Widget Test
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:tms/features/tasks/presentation/widgets/task_card.dart';

void main() {
  group('TaskCard', () {
    final task = Task(
      id: '1',
      title: 'Test Task',
      dueDate: DateTime.now().add(const Duration(days: 1)),
      priority: TaskPriority.high,
    );
    
    testWidgets('displays task title and due date', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: TaskCard(task: task))),
      );
      
      expect(find.text('Test Task'), findsOneWidget);
      expect(find.textContaining('Due:'), findsOneWidget);
    });
    
    testWidgets('tapping calls onTap callback', (tester) async {
      bool tapped = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TaskCard(
              task: task,
              onTap: () => tapped = true,
            ),
          ),
        ),
      );
      
      await tester.tap(find.byType(TaskCard));
      expect(tapped, true);
    });
    
    testWidgets('shows high priority indicator', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: TaskCard(task: task))),
      );
      
      // High priority should show red indicator
      expect(find.byIcon(Icons.flag), findsOneWidget);
    });
    
    testWidgets('renders correctly in different orientations', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: TaskCard(task: task))),
      );
      
      // Portrait
      await tester.binding.setSurfaceSize(const Size(400, 800));
      await tester.pump();
      expect(find.byType(TaskCard), findsOneWidget);
      
      // Landscape
      await tester.binding.setSurfaceSize(const Size(800, 400));
      await tester.pump();
      expect(find.byType(TaskCard), findsOneWidget);
    });
  });
}
```

### Example: Adaptive Widget Test
```dart
testWidgets('AdaptiveNavigation switches at 600px breakpoint', (tester) async {
  // Test compact layout (< 600px)
  await tester.binding.setSurfaceSize(const Size(400, 800));
  await tester.pumpWidget(
    MaterialApp(home: ResponsiveNavigationExample()),
  );
  await tester.pump();
  expect(find.byType(NavigationBar), findsOneWidget);
  expect(find.byType(NavigationRail), findsNothing);
  
  // Test expanded layout (≥ 600px)
  await tester.binding.setSurfaceSize(const Size(800, 600));
  await tester.pump();
  expect(find.byType(NavigationRail), findsOneWidget);
  expect(find.byType(NavigationBar), findsNothing);
});
```

## Integration Testing (from flutter-testing skill)

### When to Use
- Testing full user flows
- Covering multiple screens/pages
- Testing navigation
- Performance profiling

### Example: Login Flow Integration Test
```dart
import 'package:integration_test/integration_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tms/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  
  group('Login Flow', () {
    testWidgets('user can login and see task list', (tester) async {
      app.main();
      await tester.pumpAndSettle();
      
      // Verify login screen
      expect(find.text('Sign In'), findsOneWidget);
      
      // Enter credentials
      await tester.enterText(find.byType(TextFormField).at(0), 'test@example.com');
      await tester.enterText(find.byType(TextFormField).at(1), 'password123');
      
      // Tap login
      await tester.tap(find.text('Sign In'));
      await tester.pumpAndSettle(const Duration(seconds: 5));
      
      // Verify navigation to task list
      expect(find.text('Tasks'), findsOneWidget);
      expect(find.byType(NavigationBar), findsOneWidget);
    });
    
    testWidgets('logout returns to login screen', (tester) async {
      // ... login first
      await tester.tap(find.byIcon(Icons.person)); // Profile
      await tester.pumpAndSettle();
      await tester.tap(find.text('Logout'));
      await tester.pumpAndSettle();
      
      expect(find.text('Sign In'), findsOneWidget);
    });
  });
}
```

### Example: Adaptive Navigation Integration Test
```dart
testWidgets('Responsive navigation adapts to window size', (tester) async {
  // Mobile
  await tester.binding.setSurfaceSize(const Size(375, 667));
  app.main();
  await tester.pumpAndSettle();
  expect(find.byType(NavigationBar), findsOneWidget);
  
  // Tablet
  await tester.binding.setSurfaceSize(const Size(768, 1024));
  await tester.pumpAndSettle();
  expect(find.byType(NavigationRail), findsOneWidget);
  
  // Desktop
  await tester.binding.setSurfaceSize(const Size(1440, 900));
  await tester.pumpAndSettle();
  expect(find.byType(NavigationRail), findsOneWidget);
  expect(find.byType(NavigationRailLabelType.all), findsWidgets);
});
```

## Test Utilities & Helpers

### Test Data Builders
```dart
class TaskBuilder {
  String _id = '1';
  String _title = 'Test Task';
  String? _description;
  DateTime? _dueDate;
  TaskPriority _priority = TaskPriority.medium;
  TaskStatus _status = TaskStatus.todo;
  
  TaskBuilder withId(String id) { _id = id; return this; }
  TaskBuilder withTitle(String title) { _title = title; return this; }
  TaskBuilder withDescription(String desc) { _description = desc; return this; }
  TaskBuilder withDueDate(DateTime date) { _dueDate = date; return this; }
  TaskBuilder withPriority(TaskPriority priority) { _priority = priority; return this; }
  TaskBuilder withStatus(TaskStatus status) { _status = status; return this; }
  
  Task build() => Task(
    id: _id,
    title: _title,
    description: _description,
    dueDate: _dueDate,
    priority: _priority,
    status: _status,
  );
}

// Usage
final task = TaskBuilder().withTitle('My Task').withPriority(TaskPriority.high).build();
```

### Widget Test Helpers
```dart
extension WidgetTesterExtensions on WidgetTester {
  Future<void> pumpWidgetWithRouting(Widget widget) async {
    await pumpWidget(
      MaterialApp(
        home: widget,
        onGenerateRoute: (settings) => MaterialPageRoute(
          builder: (_) => widget,
        ),
      ),
    );
  }
  
  Future<void> pumpAndSettle([Duration? duration]) async {
    await pumpAndSettle(duration ?? const Duration(seconds: 1));
  }
}
```

## CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.19.0'
      - run: flutter pub get
      - run: flutter analyze
      - run: flutter test --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
  
  integration_test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
      - run: flutter pub get
      - run: flutter test integration_test/
```

## Best Practices (from flutter-testing skill)

### Test Structure
- **Arrange–Act–Assert** structure
- Descriptive test names: `should_return_loaded_when_repository_returns_data`
- Test independence - no shared state between tests
- Mock external dependencies

### Naming Conventions
```dart
// Good
test('TaskViewModel.loadTasks emits loading then loaded', () {});

// Avoid
test('loadTasks works', () {});
```

### Common Issues (from flutter-testing skill)
| Issue | Solution |
|-------|----------|
| RenderFlex overflow | Use `Expanded`, `Flexible`, or `ConstrainedBox` |
| Unbounded height/width | Wrap in `SizedBox` or `ConstrainedBox` |
| setState during build | Use `postFrameCallback` or refactor |
| Plugin crashes in tests | Mock platform channels |

## Build Modes for Testing

| Mode | Use Case |
|------|----------|
| **Debug** | Development with hot reload, assertions enabled |
| **Profile** | Performance analysis, no debug overhead |
| **Release** | Deployment testing, assertions disabled |

Run integration tests in profile mode for realistic performance:
```bash
flutter test integration_test/ --profile
```

## Coverage Goals

| Metric | Target |
|--------|--------|
| Line Coverage | > 80% |
| Branch Coverage | > 70% |
| Function Coverage | > 85% |

## References
- [flutter-testing skill](https://github.com/MADTeacher/mad-agents-skills/tree/main/flutter-testing)
- [Unit Testing](references/unit-testing.md)
- [Widget Testing](references/widget-testing.md)
- [Integration Testing](references/integration-testing.md)
- [Mocking](references/mocking.md)
- [Common Errors](references/common-errors.md)
- [Plugin Testing](references/plugin-testing.md)