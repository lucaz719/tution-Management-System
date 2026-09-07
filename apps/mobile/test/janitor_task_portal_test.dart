import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:tms_mobile/core/network/api_client.dart';
import 'package:tms_mobile/core/network/api_exception.dart';
import 'package:tms_mobile/core/sync/sync.dart';
import 'package:tms_mobile/core/theme/app_theme.dart';
import 'package:tms_mobile/features/janitor/data/janitor_portal_repository.dart';
import 'package:tms_mobile/features/janitor/models/janitor_portal_dto.dart';
import 'package:tms_mobile/features/janitor/models/janitor_task.dart';
import 'package:tms_mobile/features/janitor/screens/janitor_home_screen.dart';
import 'package:tms_mobile/features/janitor/screens/janitor_task_detail_screen.dart';
import 'package:tms_mobile/features/janitor/viewmodels/janitor_portal_viewmodel.dart';

Map<String, dynamic> _taskJson({
  required String id,
  String status = 'PENDING',
  bool overdue = false,
  String? completedBy,
}) =>
    {
      'id': id,
      'classroomId': 'Room $id',
      'location': 'Main Building',
      'description': 'Description for $id',
      'status': status,
      'createdAt': '2026-09-06T03:00:00.000Z',
      'dueAt': '2026-09-07T04:00:00.000Z',
      'overdue': overdue,
      'escalatedAt': null,
      'completionTimestamp': null,
      'completedBy':
          completedBy == null ? null : {'id': 'user-9', 'name': completedBy},
    };

Map<String, dynamic> _listJson(List<Map<String, dynamic>> tasks) =>
    {'tasks': tasks};

class _FakeJanitorRepository extends JanitorPortalRepository {
  _FakeJanitorRepository({required this.lists}) : super(dio: Dio());

  final List<JanitorTaskList> lists;
  int fetchCount = 0;
  final completedIds = <String>[];

  @override
  Future<JanitorTaskList> fetchMyTasks({CancelToken? cancelToken}) async {
    final index = fetchCount < lists.length ? fetchCount : lists.length - 1;
    fetchCount += 1;
    return lists[index];
  }

  @override
  Future<DateTime> completeTask(
    String taskId, {
    CancelToken? cancelToken,
  }) async {
    completedIds.add(taskId);
    return DateTime.utc(2026, 9, 7, 10);
  }
}

Future<void> _pumpWithRepository(
  WidgetTester tester,
  Widget child,
  _FakeJanitorRepository repository,
) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        janitorPortalViewModelProvider.overrideWith(
          (ref) => JanitorPortalViewModel(repository: repository),
        ),
        connectivityMonitorProvider.overrideWith(
          (ref) => ConnectivityMonitor(
            check: () async => true,
            autostart: false,
          ),
        ),
      ],
      child: MaterialApp(theme: buildTmsTheme(), home: child),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  GoogleFonts.config.allowRuntimeFetching = false;

  group('JanitorPortalRepository', () {
    test('requests my-tasks and parses the server payload', () async {
      final dio = ApiClient.buildDio(
        baseUrl: 'https://test.invalid',
        extraInterceptors: [
          InterceptorsWrapper(
            onRequest: (options, handler) {
              expect(options.method, 'GET');
              expect(options.path, JanitorPortalRepository.myTasksPath);
              expect(options.queryParameters, isEmpty);
              handler.resolve(Response<dynamic>(
                requestOptions: options,
                statusCode: 200,
                data: _listJson([
                  _taskJson(id: 'task-1'),
                  _taskJson(
                    id: 'task-2',
                    status: 'COMPLETED',
                    completedBy: 'Aarati Shrestha',
                  ),
                ]),
              ));
            },
          ),
        ],
      );

      final list = await JanitorPortalRepository(dio: dio).fetchMyTasks();

      expect(list.tasks, hasLength(2));
      expect(list.tasks.first.id, 'task-1');
      expect(list.tasks.first.clientStatus, JanitorTaskStatus.assigned);
      expect(list.tasks.last.clientStatus, JanitorTaskStatus.completed);
      expect(list.tasks.last.completedByName, 'Aarati Shrestha');
    });

    test('rejects an unexpected response body with a typed error', () async {
      final dio = ApiClient.buildDio(
        baseUrl: 'https://test.invalid',
        extraInterceptors: [
          InterceptorsWrapper(
            onRequest: (options, handler) {
              handler.resolve(Response<dynamic>(
                requestOptions: options,
                statusCode: 200,
                data: ['not', 'a', 'map'],
              ));
            },
          ),
        ],
      );

      expect(
        () => JanitorPortalRepository(dio: dio).fetchMyTasks(),
        throwsA(isA<ApiException>()),
      );
    });

    test('posts task completion without client identity fields', () async {
      late RequestOptions captured;
      final dio = ApiClient.buildDio(
        baseUrl: 'https://test.invalid',
        extraInterceptors: [
          InterceptorsWrapper(
            onRequest: (options, handler) {
              captured = options;
              handler.resolve(Response<dynamic>(
                requestOptions: options,
                statusCode: 200,
                data: {
                  'task': {
                    'completionTimestamp': '2026-09-07T10:00:00.000Z',
                  },
                },
              ));
            },
          ),
        ],
      );

      final stamp =
          await JanitorPortalRepository(dio: dio).completeTask('task-1');

      expect(captured.method, 'POST');
      expect(
        captured.path,
        JanitorPortalRepository.completeTaskPath('task-1'),
      );
      expect((captured.data as Map).keys, isNot(contains('userId')));
      expect((captured.data as Map).keys, isNot(contains('tenantId')));
      expect(stamp, DateTime.parse('2026-09-07T10:00:00.000Z'));
    });
  });

  group('janitor DTO mapping', () {
    test('maps server statuses onto client states', () {
      expect(
        JanitorMaintenanceTask.fromJson(_taskJson(id: 'a', status: 'PENDING'))
            .clientStatus,
        JanitorTaskStatus.assigned,
      );
      expect(
        JanitorMaintenanceTask.fromJson(
          _taskJson(id: 'b', status: 'IN_PROGRESS'),
        ).clientStatus,
        JanitorTaskStatus.inProgress,
      );
      expect(
        JanitorMaintenanceTask.fromJson(
          _taskJson(id: 'c', status: 'ESCALATED'),
        ).clientStatus,
        JanitorTaskStatus.assigned,
      );
    });

    test('derives high priority for overdue or escalated work', () {
      final overdue = JanitorMaintenanceTask.fromJson(
        _taskJson(id: 'a', overdue: true),
      );
      final escalated = JanitorMaintenanceTask.fromJson(
        _taskJson(id: 'b', status: 'ESCALATED'),
      );
      final routine = JanitorMaintenanceTask.fromJson(_taskJson(id: 'c'));
      expect(overdue.derivedPriority, JanitorTaskPriority.high);
      expect(escalated.derivedPriority, JanitorTaskPriority.high);
      expect(routine.derivedPriority, JanitorTaskPriority.medium);
    });

    test('sorts UI tasks by due date', () {
      final list = JanitorTaskList.fromJson(_listJson([
        {
          ..._taskJson(id: 'late'),
          'dueAt': '2026-09-08T04:00:00.000Z',
        },
        {
          ..._taskJson(id: 'early'),
          'dueAt': '2026-09-06T04:00:00.000Z',
        },
      ]));
      final tasks = list.toTasks();
      expect(tasks.map((task) => task.id), ['early', 'late']);
    });
  });

  group('janitor viewmodel', () {
    test('loads server tasks into state', () async {
      final repository = _FakeJanitorRepository(
        lists: [
          JanitorTaskList.fromJson(
            _listJson([_taskJson(id: 'task-1')]),
          ),
        ],
      );
      final vm = JanitorPortalViewModel(repository: repository);
      await Future<void>.delayed(Duration.zero);

      expect(vm.state.isLoading, isFalse);
      expect(vm.state.tasks.single.id, 'task-1');
      expect(vm.state.tasks.single.status, JanitorTaskStatus.assigned);
      vm.dispose();
    });

    test('start is local-only and never hits the network', () async {
      final repository = _FakeJanitorRepository(
        lists: [
          JanitorTaskList.fromJson(
            _listJson([_taskJson(id: 'task-1')]),
          ),
        ],
      );
      final vm = JanitorPortalViewModel(repository: repository);
      await Future<void>.delayed(Duration.zero);

      vm.startTask('task-1');

      expect(vm.state.tasks.single.status, JanitorTaskStatus.inProgress);
      expect(repository.fetchCount, 1);
      expect(repository.completedIds, isEmpty);
      vm.dispose();
    });

    test('complete posts to the server then refreshes the list', () async {
      final repository = _FakeJanitorRepository(
        lists: [
          JanitorTaskList.fromJson(
            _listJson([_taskJson(id: 'task-1', status: 'IN_PROGRESS')]),
          ),
          JanitorTaskList.fromJson(
            _listJson([_taskJson(id: 'task-1', status: 'COMPLETED')]),
          ),
        ],
      );
      final vm = JanitorPortalViewModel(repository: repository);
      await Future<void>.delayed(Duration.zero);

      final ok = await vm.completeTask('task-1');

      expect(ok, isTrue);
      expect(repository.completedIds, ['task-1']);
      expect(repository.fetchCount, 2);
      expect(vm.state.tasks.single.status, JanitorTaskStatus.completed);
      vm.dispose();
    });
  });

  group('janitor widgets', () {
    testWidgets('filters tasks across today, upcoming, and completed',
        (tester) async {
      final now = DateTime.now();
      String iso(DateTime value) => value.toIso8601String();
      final repository = _FakeJanitorRepository(
        lists: [
          JanitorTaskList.fromJson({
            'tasks': [
              {
                ..._taskJson(id: 'today-task'),
                'classroomId': 'Clean reception desk',
                'dueAt': iso(
                  DateTime(now.year, now.month, now.day, 9),
                ),
              },
              {
                ..._taskJson(id: 'upcoming-task'),
                'classroomId': 'Restock washroom supplies',
                'dueAt': iso(
                  DateTime(now.year, now.month, now.day + 2, 10),
                ),
              },
              {
                ..._taskJson(id: 'done-task', status: 'COMPLETED'),
                'classroomId': 'Mop library corridor',
                'dueAt': iso(
                  DateTime(now.year, now.month, now.day - 1, 16),
                ),
              },
            ],
          }),
        ],
      );
      await tester.binding.setSurfaceSize(const Size(900, 1100));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await _pumpWithRepository(
        tester,
        const JanitorHomeScreen(),
        repository,
      );

      expect(find.text('Clean reception desk'), findsOneWidget);
      expect(find.text('Restock washroom supplies'), findsNothing);

      await tester.tap(find.text('Upcoming'));
      await tester.pumpAndSettle();
      expect(find.text('Restock washroom supplies'), findsOneWidget);

      await tester.tap(find.text('Completed'));
      await tester.pumpAndSettle();
      expect(find.text('Mop library corridor'), findsOneWidget);
    });

    testWidgets('starts then completes a task from its detail screen',
        (tester) async {
      Map<String, dynamic> payload(String status) => {
            'tasks': [
              {
                ..._taskJson(id: 'task-1', status: status),
                'classroomId': 'Sanitize science lab',
              },
            ],
          };
      final repository = _FakeJanitorRepository(
        lists: [
          JanitorTaskList.fromJson(payload('PENDING')),
          JanitorTaskList.fromJson(payload('COMPLETED')),
        ],
      );
      final task =
          JanitorTaskList.fromJson(payload('PENDING')).toTasks().single;
      await _pumpWithRepository(
        tester,
        JanitorTaskDetailScreen(task: task),
        repository,
      );

      await tester.tap(find.text('Start task'));
      await tester.pumpAndSettle();
      expect(find.text('Mark complete'), findsOneWidget);

      await tester.tap(find.text('Mark complete'));
      await tester.pumpAndSettle();

      expect(repository.completedIds, ['task-1']);
      expect(find.text('Task completed'), findsOneWidget);
    });
  });
}
