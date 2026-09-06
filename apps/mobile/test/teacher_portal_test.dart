import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tms_mobile/core/network/api_client.dart';
import 'package:tms_mobile/core/sync/sync.dart';
import 'package:tms_mobile/features/teacher/data/teacher_portal_repository.dart';
import 'package:tms_mobile/features/teacher/models/teacher_portal_dto.dart';
import 'package:tms_mobile/features/teacher/screens/teacher_leave_screen.dart';
import 'package:tms_mobile/features/teacher/screens/teacher_timetable_screen.dart';
import 'package:tms_mobile/features/teacher/viewmodels/geo_attendance_viewmodel.dart';
import 'package:tms_mobile/features/teacher/viewmodels/teacher_leave_viewmodel.dart';
import 'package:tms_mobile/features/teacher/viewmodels/teacher_portal_viewmodel.dart';
import 'package:tms_mobile/features/teacher/widgets/geo_radius_card.dart';

Map<String, dynamic> workspaceJson({
  List<Map<String, dynamic>>? leaves,
}) =>
    {
      'teacher': {
        'name': 'Aarati Shrestha',
        'designation': 'Senior Teacher',
        'branches': [
          {'id': 'branch-1', 'name': 'Baneshwor'},
        ],
      },
      'statistics': {'attendanceRate': 92, 'presentDays': 20},
      'attendance': {
        'checkedIn': true,
        'lastStampType': 'IN',
        'lastStampAt': '2026-09-06T03:15:00.000Z',
      },
      'todayClasses': [
        {
          'sessionId': 'session-1',
          'classId': 'class-1',
          'className': 'Grade 8 · A',
          'courseName': 'Mathematics',
          'branch': {'id': 'branch-1', 'name': 'Baneshwor'},
          'schedule': [
            {
              'day': 'Sunday',
              'start': '09:00',
              'end': '10:00',
              'subject': 'Algebra',
            },
          ],
          'status': 'PRESENT_UPDATE_PENDING',
          'dailyUpdateSubmitted': false,
        },
      ],
      'pendingUpdates': [
        {'sessionId': 'session-1'},
      ],
      'classes': [
        {
          'id': 'class-1',
          'name': 'Grade 8 · A',
          'subject': 'Mathematics',
          'schedule': [
            {'day': 'Sun', 'start': '09:00', 'end': '10:00'},
            {'day': 'Wednesday', 'start': '11:00', 'end': '12:00'},
          ],
          'branch': {
            'id': 'branch-1',
            'name': 'Baneshwor',
            'address': 'Kathmandu',
            'radiusMeters': 125,
          },
          'students': [
            {'id': 'student-1'},
            {'id': 'student-2'},
          ],
        },
      ],
      'leaves': leaves ??
          [
            {
              'id': 'leave-1',
              'leaveType': 'CASUAL',
              'status': 'APPROVED_LEVEL1',
              'reason': 'Family event',
              'startDate': '2026-09-08T00:00:00.000Z',
              'endDate': '2026-09-09T00:00:00.000Z',
            },
          ],
      'stamps': [
        {
          'stampType': 'IN',
          'timestamp': '2026-09-06T03:15:00.000Z',
          'branchName': 'Baneshwor',
        },
      ],
    };

class _FakeRepository extends TeacherPortalRepository {
  _FakeRepository({
    required this.workspaces,
    this.submittedLeave,
  }) : super(dio: Dio());

  final List<TeacherWorkspace> workspaces;
  final TeacherLeaveEntry? submittedLeave;
  int fetchCount = 0;
  Map<String, Object?>? leaveRequest;

  @override
  Future<TeacherWorkspace> fetchWorkspace({CancelToken? cancelToken}) async {
    final index =
        fetchCount < workspaces.length ? fetchCount : workspaces.length - 1;
    fetchCount += 1;
    return workspaces[index];
  }

  @override
  Future<TeacherLeaveEntry> submitLeave({
    required String branchId,
    required String leaveType,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
    CancelToken? cancelToken,
  }) async {
    leaveRequest = {
      'branchId': branchId,
      'leaveType': leaveType,
      'startDate': startDate,
      'endDate': endDate,
      'reason': reason,
    };
    return submittedLeave!;
  }
}

Future<void> _pumpWithRepository(
  WidgetTester tester,
  Widget child,
  _FakeRepository repository,
) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        teacherPortalViewModelProvider.overrideWith(
          (ref) => TeacherPortalViewModel(repository: repository),
        ),
        teacherLeaveViewModelProvider.overrideWith(
          (ref) => TeacherLeaveViewModel(repository: repository),
        ),
        connectivityMonitorProvider.overrideWith(
          (ref) => ConnectivityMonitor(
            check: () async => true,
            autostart: false,
          ),
        ),
      ],
      child: MaterialApp(home: child),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

void main() {
  group('TeacherPortalRepository', () {
    test('requests workspace and parses daily and weekly schedules', () async {
      final dio = ApiClient.buildDio(
        baseUrl: 'https://test.invalid',
        extraInterceptors: [
          InterceptorsWrapper(
            onRequest: (options, handler) {
              expect(options.method, 'GET');
              expect(options.path, TeacherPortalRepository.workspacePath);
              expect(options.queryParameters, isEmpty);
              handler.resolve(Response<dynamic>(
                requestOptions: options,
                statusCode: 200,
                data: workspaceJson(),
              ));
            },
          ),
        ],
      );

      final workspace =
          await TeacherPortalRepository(dio: dio).fetchWorkspace();

      expect(workspace.teacherName, 'Aarati Shrestha');
      expect(workspace.todayClasses.single.branchName, 'Baneshwor');
      expect(workspace.todayClasses.single.scheduleLabel, 'Sunday 09:00–10:00');
      expect(workspace.classes.single.slots, hasLength(2));
      expect(workspace.classes.single.isScheduledOn('Sun'), isTrue);
      expect(workspace.classes.single.isScheduledOn('Mon'), isFalse);
      expect(workspace.classes.single.branch!.radiusMeters, 125);
      expect(workspace.pendingUpdateCount, 1);
      expect(workspace.leaves.single.isPending, isTrue);
    });

    test('submits the exact leave request body and parses returned status',
        () async {
      late RequestOptions captured;
      final dio = ApiClient.buildDio(
        baseUrl: 'https://test.invalid',
        extraInterceptors: [
          InterceptorsWrapper(
            onRequest: (options, handler) {
              captured = options;
              handler.resolve(Response<dynamic>(
                requestOptions: options,
                statusCode: 201,
                data: {
                  'leave': {
                    'id': 'leave-2',
                    'leaveType': 'SICK',
                    'status': 'PENDING',
                    'reason': 'Flu',
                    'startDate': '2026-09-10T00:00:00.000Z',
                    'endDate': '2026-09-11T00:00:00.000Z',
                  },
                },
              ));
            },
          ),
        ],
      );
      final start = DateTime.utc(2026, 9, 10);
      final end = DateTime.utc(2026, 9, 11);

      final leave = await TeacherPortalRepository(dio: dio).submitLeave(
        branchId: 'branch-1',
        leaveType: 'SICK',
        startDate: start,
        endDate: end,
        reason: 'Flu',
      );

      expect(captured.method, 'POST');
      expect(captured.path, TeacherPortalRepository.leaveRequestPath);
      expect(captured.data, {
        'branchId': 'branch-1',
        'leaveType': 'SICK',
        'startDate': start.toIso8601String(),
        'endDate': end.toIso8601String(),
        'reason': 'Flu',
      });
      expect(leave.id, 'leave-2');
      expect(leave.status, 'PENDING');
    });

    test('posts geo attendance coordinates without client identity fields',
        () async {
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
                data: {'message': 'Attendance marked.'},
              ));
            },
          ),
        ],
      );

      await TeacherPortalRepository(dio: dio).markGeoIn(
        branchId: 'branch-1',
        latitude: 27.7172,
        longitude: 85.3240,
        gpsAccuracy: 8,
      );

      expect(captured.method, 'POST');
      expect(captured.path, TeacherPortalRepository.geoInPath);
      expect(captured.data, {
        'branchId': 'branch-1',
        'latitude': 27.7172,
        'longitude': 85.3240,
        'gpsAccuracy': 8.0,
      });
      expect((captured.data as Map).keys, isNot(contains('userId')));
      expect((captured.data as Map).keys, isNot(contains('tenantId')));
    });
  });

  group('teacher viewmodels', () {
    test('portal load exposes workspace-backed daily and weekly data',
        () async {
      final workspace = TeacherWorkspace.fromJson(workspaceJson());
      final repository = _FakeRepository(workspaces: [workspace]);
      final vm = TeacherPortalViewModel(repository: repository);
      await Future<void>.delayed(Duration.zero);

      expect(vm.state.workspace, same(workspace));
      expect(vm.state.workspace!.todayClasses.single.sessionId, 'session-1');
      expect(vm.state.workspace!.classes.single.isScheduledOn('Wed'), isTrue);
      expect(vm.state.isLoading, isFalse);
      vm.dispose();
    });

    test('leave submit refreshes workspace so server status is authoritative',
        () async {
      final before = TeacherWorkspace.fromJson(workspaceJson(leaves: []));
      final submitted = TeacherLeaveEntry.fromJson({
        'id': 'leave-2',
        'leaveType': 'SICK',
        'status': 'PENDING',
      });
      final after = TeacherWorkspace.fromJson(workspaceJson(leaves: [
        {
          'id': 'leave-2',
          'leaveType': 'SICK',
          'status': 'APPROVED_LEVEL1',
        },
      ]));
      final repository = _FakeRepository(
        workspaces: [before, after],
        submittedLeave: submitted,
      );
      final vm = TeacherLeaveViewModel(repository: repository);
      await Future<void>.delayed(Duration.zero);

      final ok = await vm.submitLeave(
        branchId: 'branch-1',
        leaveType: 'SICK',
        startDate: DateTime.utc(2026, 9, 10),
        endDate: DateTime.utc(2026, 9, 11),
        reason: 'Flu',
      );

      expect(ok, isTrue);
      expect(repository.fetchCount, 2);
      expect(vm.state.leaves.single.status, 'APPROVED_LEVEL1');
      expect(repository.leaveRequest!['reason'], 'Flu');
      vm.dispose();
    });
  });

  group('teacher timetable and leave widgets', () {
    testWidgets('renders workspace daily and weekly timetable records',
        (tester) async {
      final repository = _FakeRepository(
        workspaces: [TeacherWorkspace.fromJson(workspaceJson())],
      );
      await _pumpWithRepository(
        tester,
        const TeacherTimetableScreen(),
        repository,
      );

      await tester.tap(find.text('Today'));
      await tester.pumpAndSettle();
      expect(find.text('Mathematics'), findsOneWidget);
      expect(find.text('Sunday 09:00–10:00'), findsOneWidget);

      await tester.tap(find.text('Sun'));
      await tester.pumpAndSettle();
      expect(find.text('Grade 8 · A • Baneshwor'), findsOneWidget);
      expect(
        find.text('Sun 09:00–10:00, Wednesday 11:00–12:00'),
        findsOneWidget,
      );

      await tester.tap(find.text('Mon'));
      await tester.pumpAndSettle();
      expect(find.text('No classes on Mon'), findsOneWidget);
    });

    testWidgets('renders leave status from the refreshed workspace',
        (tester) async {
      final repository = _FakeRepository(
        workspaces: [TeacherWorkspace.fromJson(workspaceJson())],
      );
      await _pumpWithRepository(
        tester,
        const TeacherLeaveScreen(),
        repository,
      );

      expect(find.text('CASUAL'), findsOneWidget);
      expect(find.text('APPROVED_LEVEL1'), findsOneWidget);
      expect(find.text('Family event'), findsOneWidget);
    });
  });

  group('geo-attendance radius eligibility', () {
    test('enables inside, blocks outside, and defers unknown center to server',
        () {
      final inside = GeoAttendanceViewModel(
        repository: _FakeRepository(workspaces: const []),
        branchId: 'branch-1',
        branchLatitude: 27.7172,
        branchLongitude: 85.3240,
        branchRadiusMeters: 100,
      );
      inside.updatePosition(
          latitude: 27.7172, longitude: 85.3240, gpsAccuracy: 5);
      expect(inside.insideRadiusOrUnknown, isTrue);
      expect(inside.canMark, isTrue);
      inside.updatePosition(
          latitude: 27.7272, longitude: 85.3240, gpsAccuracy: 5);
      expect(inside.insideRadiusOrUnknown, isFalse);
      expect(inside.canMark, isFalse);
      inside.dispose();

      final unknown = GeoAttendanceViewModel(
        repository: _FakeRepository(workspaces: const []),
        branchId: 'branch-1',
        branchLatitude: null,
        branchLongitude: null,
        branchRadiusMeters: 100,
      );
      unknown.updatePosition(
          latitude: 27.7172, longitude: 85.3240, gpsAccuracy: 5);
      expect(unknown.insideRadiusOrUnknown, isNull);
      expect(unknown.canMark, isTrue);
      unknown.dispose();
    });

    testWidgets('radius card distinguishes known and server-verified geofences',
        (tester) async {
      await tester.pumpWidget(const MaterialApp(
        home: Scaffold(
          body: GeoRadiusCard(
            distanceMeters: 42,
            radiusMeters: 100,
            insideRadius: true,
            gpsAccuracy: 8,
          ),
        ),
      ));
      expect(find.text('42 m from branch'), findsOneWidget);
      expect(find.text('Inside 100 m geofence'), findsOneWidget);
      expect(find.text('GPS accuracy: ±8 m'), findsOneWidget);

      await tester.pumpWidget(const MaterialApp(
        home: Scaffold(
          body: GeoRadiusCard(
            distanceMeters: null,
            radiusMeters: 100,
            insideRadius: null,
            gpsAccuracy: 8,
          ),
        ),
      ));
      expect(find.text('Distance checked by server'), findsOneWidget);
      expect(
          find.textContaining('Branch center is not shared'), findsOneWidget);
    });
  });
}
