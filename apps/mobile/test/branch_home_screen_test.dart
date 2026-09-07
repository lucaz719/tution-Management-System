import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tms_mobile/core/network/api_client.dart';
import 'package:tms_mobile/features/branch_manager/data/branch_portal_repository.dart';
import 'package:tms_mobile/features/branch_manager/models/branch_portal_dto.dart';
import 'package:tms_mobile/features/branch_manager/screens/branch_home_screen.dart';
import 'package:tms_mobile/features/branch_manager/viewmodels/branch_portal_viewmodel.dart';

Map<String, dynamic> dashboardJson() => {
      'branches': [
        {'id': 'branch-1', 'name': 'Baneshwor'},
        {'id': 'branch-2', 'name': 'Lalitpur'},
      ],
      'selectedBranch': {'id': 'branch-1', 'name': 'Baneshwor'},
      'generatedAt': '2026-09-06T03:15:00.000Z',
      'metrics': {
        'teacherAttendance': {'present': 28, 'total': 31, 'rate': 90},
        'studentAttendance': {'present': 180, 'total': 192, 'rate': 94},
        'blockedStudents': 3,
        'pendingInvoices': 12,
        'outstandingAmount': 45000,
        'pendingAppointments': 2,
      },
      'timetable': [
        {
          'id': 'session-1',
          'time': '2026-09-06T03:15:00.000Z',
          'title': 'Grade 8 · A',
          'detail': 'Mathematics · Aarati Shrestha',
          'room': 'Grade 8 · A',
          'status': 'SCHEDULED',
        },
      ],
      'resources': [
        {
          'id': 'res-1',
          'label': 'Science lab projector',
          'detail': 'Repair due today',
          'status': 'OPEN',
          'actionRequired': true,
          'createdAt': '2026-09-05T00:00:00.000Z',
        },
      ],
      'pettyCash': [
        {
          'id': 'cash-1',
          'amount': 2500,
          'purpose': 'Lab supplies',
          'status': 'PENDING'
        },
      ],
      'appointments': [
        {
          'id': 'appt-1',
          'parent': 'Hari Bahadur',
          'student': 'Sita Sharma',
          'preferredTime': '2026-09-07T04:00:00.000Z',
          'description': 'Parent requested a meeting.',
        },
      ],
    };

Map<String, dynamic> leaveJson(String id, String status) => {
      'id': id,
      'staffName': 'Ramesh Karki',
      'branchId': 'branch-1',
      'branchName': 'Baneshwor',
      'leaveType': 'CASUAL',
      'startDate': '2026-09-08T00:00:00.000Z',
      'endDate': '2026-09-09T00:00:00.000Z',
      'reason': 'Family event',
      'status': status,
      'remarks': null,
      'createdAt': '2026-09-06T00:00:00.000Z',
    };

class _FakeBranchRepository extends BranchPortalRepository {
  _FakeBranchRepository({
    required this.dashboard,
    required this.leaves,
  }) : super(dio: Dio());

  final BranchDashboard dashboard;
  final List<BranchLeaveRequest> leaves;
  int dashboardCalls = 0;
  int leaveQueueCalls = 0;

  @override
  Future<BranchDashboard> fetchDashboard({
    String? branchId,
    CancelToken? cancelToken,
  }) async {
    dashboardCalls += 1;
    return dashboard;
  }

  @override
  Future<List<BranchLeaveRequest>> fetchLeaveQueue({
    CancelToken? cancelToken,
  }) async {
    leaveQueueCalls += 1;
    return leaves;
  }

  @override
  Future<BranchLeaveRequest> decideLeave({
    required String leaveId,
    required bool approve,
    String? remarks,
    CancelToken? cancelToken,
  }) async {
    final current = leaves.firstWhere((leave) => leave.id == leaveId);
    return current.copyWith(
      status: approve ? 'APPROVED_LEVEL2' : 'REJECTED',
      remarks: remarks,
    );
  }
}

Future<void> _pumpWithRepository(
  WidgetTester tester,
  _FakeBranchRepository repository,
) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        branchPortalViewModelProvider.overrideWith(
          (ref) => BranchPortalViewModel(repository: repository),
        ),
      ],
      child: const MaterialApp(home: BranchHomeScreen()),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

void main() {
  group('BranchPortal DTOs', () {
    test('dashboard parses the server payload shape', () {
      final dashboard = BranchDashboard.fromJson(dashboardJson());

      expect(dashboard.branches, hasLength(2));
      expect(dashboard.selectedBranch!.name, 'Baneshwor');
      expect(dashboard.metrics.teacherAttendance.present, 28);
      expect(dashboard.metrics.studentAttendance.label, '94%');
      expect(dashboard.metrics.blockedStudents, 3);
      expect(dashboard.metrics.outstandingAmount, 45000);
      expect(dashboard.timetable.single.title, 'Grade 8 · A');
      expect(dashboard.resources.single.actionRequired, isTrue);
      expect(dashboard.pettyCash.single.purpose, 'Lab supplies');
      expect(dashboard.appointments.single.student, 'Sita Sharma');
    });

    test('leave pending flag only matches PENDING rows', () {
      expect(
        BranchLeaveRequest.fromJson(leaveJson('l-1', 'PENDING')).isPending,
        isTrue,
      );
      expect(
        BranchLeaveRequest.fromJson(leaveJson('l-1', 'APPROVED_LEVEL2'))
            .isPending,
        isFalse,
      );
    });
  });

  group('BranchPortalRepository', () {
    test('dashboard sends branchId as scope hint only', () async {
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
                data: dashboardJson(),
              ));
            },
          ),
        ],
      );

      final dashboard = await BranchPortalRepository(dio: dio)
          .fetchDashboard(branchId: 'branch-1');

      expect(captured.method, 'GET');
      expect(captured.path, BranchPortalRepository.dashboardPath);
      expect(captured.queryParameters['branchId'], 'branch-1');
      expect(dashboard.selectedBranch!.id, 'branch-1');
    });

    test('leave queue requests L1 and parses the leaves list', () async {
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
                  'leaves': [leaveJson('leave-1', 'PENDING')],
                },
              ));
            },
          ),
        ],
      );

      final leaves = await BranchPortalRepository(dio: dio).fetchLeaveQueue();

      expect(captured.method, 'GET');
      expect(captured.path, BranchPortalRepository.leaveQueuePath);
      expect(captured.queryParameters['level'], 'L1');
      expect(leaves.single.staffName, 'Ramesh Karki');
      expect(leaves.single.isPending, isTrue);
    });

    test('leave decision posts action without client identity fields',
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
                data: {
                  'message': 'Leave request successfully updated.',
                  'leave': {
                    'id': 'leave-1',
                    'status': 'APPROVED_LEVEL2',
                    'branchId': 'branch-1',
                  },
                },
              ));
            },
          ),
        ],
      );

      final decided = await BranchPortalRepository(dio: dio).decideLeave(
        leaveId: 'leave-1',
        approve: true,
      );

      expect(captured.method, 'POST');
      expect(
        captured.path,
        BranchPortalRepository.leaveApprovePath('leave-1'),
      );
      expect(captured.data['action'], 'APPROVE');
      expect((captured.data as Map).keys, isNot(contains('userId')));
      expect((captured.data as Map).keys, isNot(contains('tenantId')));
      expect((captured.data as Map).keys, isNot(contains('branchId')));
      expect(decided.status, 'APPROVED_LEVEL2');
    });

    test('petty-cash list parses the raw server array', () async {
      final dio = ApiClient.buildDio(
        baseUrl: 'https://test.invalid',
        extraInterceptors: [
          InterceptorsWrapper(
            onRequest: (options, handler) {
              handler.resolve(Response<dynamic>(
                requestOptions: options,
                statusCode: 200,
                data: [
                  {
                    'id': 'cash-1',
                    'amount': 2500,
                    'purpose': 'Lab supplies',
                    'status': 'PENDING',
                  },
                ],
              ));
            },
          ),
        ],
      );

      final entries = await BranchPortalRepository(dio: dio).fetchPettyCash();

      expect(entries.single.id, 'cash-1');
      expect(entries.single.amount, 2500);
    });
  });

  group('BranchPortalViewModel', () {
    test('load exposes dashboard-backed queues', () async {
      final repository = _FakeBranchRepository(
        dashboard: BranchDashboard.fromJson(dashboardJson()),
        leaves: [BranchLeaveRequest.fromJson(leaveJson('leave-1', 'PENDING'))],
      );
      final vm = BranchPortalViewModel(repository: repository);
      await Future<void>.delayed(Duration.zero);

      expect(vm.state.hasData, isTrue);
      expect(vm.state.dashboard!.selectedBranch!.name, 'Baneshwor');
      expect(vm.state.pendingLeaves, hasLength(1));
      expect(vm.state.pendingCash, hasLength(1));
      vm.dispose();
    });

    test('reject without remarks stays local with an error', () async {
      final repository = _FakeBranchRepository(
        dashboard: BranchDashboard.fromJson(dashboardJson()),
        leaves: [BranchLeaveRequest.fromJson(leaveJson('leave-1', 'PENDING'))],
      );
      final vm = BranchPortalViewModel(repository: repository);
      await Future<void>.delayed(Duration.zero);

      await vm.decideLeave(vm.state.leaves.single, approve: false);

      expect(vm.state.error, 'A rejection reason is required.');
      expect(vm.state.pendingLeaves, hasLength(1));
      vm.dispose();
    });

    test('approve updates the queue row and surfaces a notice', () async {
      final repository = _FakeBranchRepository(
        dashboard: BranchDashboard.fromJson(dashboardJson()),
        leaves: [BranchLeaveRequest.fromJson(leaveJson('leave-1', 'PENDING'))],
      );
      final vm = BranchPortalViewModel(repository: repository);
      await Future<void>.delayed(Duration.zero);

      await vm.decideLeave(vm.state.leaves.single, approve: true);

      expect(vm.state.pendingLeaves, isEmpty);
      expect(vm.state.notice, 'Leave request approved.');
      vm.dispose();
    });
  });

  group('BranchHomeScreen', () {
    testWidgets('shows live branch data instead of demo values',
        (tester) async {
      final repository = _FakeBranchRepository(
        dashboard: BranchDashboard.fromJson(dashboardJson()),
        leaves: [BranchLeaveRequest.fromJson(leaveJson('leave-1', 'PENDING'))],
      );
      tester.view.physicalSize = const Size(800, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      await _pumpWithRepository(tester, repository);

      expect(find.text('Branch Manager'), findsOneWidget);
      expect(find.text('Baneshwor Branch'), findsOneWidget);
      expect(find.text('94%'), findsOneWidget);
      expect(find.text('28 / 31'), findsOneWidget);
      expect(find.text('Ramesh Karki'), findsOneWidget);
      expect(find.text('Lab supplies'), findsOneWidget);
      expect(find.byKey(const Key('approve-leave-leave-1')), findsOneWidget);
      expect(find.byKey(const Key('cash-cash-1')), findsOneWidget);
    });

    testWidgets('shows an empty state when no branch is managed',
        (tester) async {
      final empty = BranchDashboard(
        branches: const [],
        selectedBranch: null,
        metrics: BranchMetrics.fromJson(const {}),
      );
      await _pumpWithRepository(
        tester,
        _FakeBranchRepository(dashboard: empty, leaves: const []),
      );

      expect(find.text('No managed branch'), findsOneWidget);
    });
  });
}
