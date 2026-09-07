import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tms_mobile/core/network/api_client.dart';
import 'package:tms_mobile/core/network/api_exception.dart';
import 'package:tms_mobile/features/tenant_admin/data/tenant_admin_repository.dart';
import 'package:tms_mobile/features/tenant_admin/models/tenant_admin_dashboard.dart';
import 'package:tms_mobile/features/tenant_admin/screens/tenant_admin_home_screen.dart';
import 'package:tms_mobile/features/tenant_admin/viewmodels/tenant_admin_viewmodel.dart';

Map<String, dynamic> _dashboardJson() => {
      'activeStudentsCount': 412,
      'activeTeachersCount': 38,
      'totalOverdueAmountNpr': 125000.5,
      'pendingLeaveRequestsCount': 7,
      'branchSummary': [
        {
          'branchId': 'branch-1',
          'branchName': 'Baneshwor',
          'activeStudents': 210,
          'staffCount': 22,
        },
        {
          'branchId': 'branch-2',
          'branchName': 'Lalitpur',
          'activeStudents': 202,
          'staffCount': 16,
        },
      ],
    };

class _FakeTenantAdminRepository extends TenantAdminRepository {
  _FakeTenantAdminRepository({this.dashboard, this.failure})
      : super(dio: Dio());

  final TenantAdminDashboard? dashboard;
  final ApiException? failure;

  @override
  Future<TenantAdminDashboard> fetchDashboard({CancelToken? cancelToken}) {
    if (failure != null) throw failure!;
    return Future.value(dashboard!);
  }
}

Future<void> _pumpAdminScreen(
  WidgetTester tester,
  TenantAdminRepository repository,
) async {
  tester.view.physicalSize = const Size(900, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        tenantAdminProvider.overrideWith(
          (ref) => TenantAdminViewModel(repository: repository),
        ),
      ],
      child: const MaterialApp(home: TenantAdminHomeScreen()),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 50));
}

void main() {
  group('TenantAdminRepository', () {
    test('sends session GET and parses the dashboard snapshot', () async {
      final dio = ApiClient.buildDio(
        baseUrl: 'https://test.invalid',
        extraInterceptors: [
          InterceptorsWrapper(
            onRequest: (options, handler) {
              expect(options.path, TenantAdminRepository.dashboardPath);
              expect(options.method, 'GET');
              expect(options.data, isNull);
              handler.resolve(
                Response<dynamic>(
                  requestOptions: options,
                  statusCode: 200,
                  data: _dashboardJson(),
                ),
              );
            },
          ),
        ],
      );

      final dashboard = await TenantAdminRepository(dio: dio).fetchDashboard();

      expect(dashboard.activeStudentsCount, 412);
      expect(dashboard.activeTeachersCount, 38);
      expect(dashboard.totalOverdueAmountNpr, 125000.5);
      expect(dashboard.pendingLeaveRequestsCount, 7);
      expect(
        dashboard.branchSummary.map((branch) => branch.branchName),
        ['Baneshwor', 'Lalitpur'],
      );
      expect(dashboard.totalStaff, 38);
    });

    test('rejects non-object payloads with a typed error', () async {
      final dio = ApiClient.buildDio(
        baseUrl: 'https://test.invalid',
        extraInterceptors: [
          InterceptorsWrapper(
            onRequest: (options, handler) {
              handler.resolve(
                Response<dynamic>(
                  requestOptions: options,
                  statusCode: 200,
                  data: ['not', 'an', 'object'],
                ),
              );
            },
          ),
        ],
      );

      expect(
        () => TenantAdminRepository(dio: dio).fetchDashboard(),
        throwsA(isA<ApiException>()),
      );
    });
  });

  group('TenantAdminViewModel', () {
    test('loads the dashboard snapshot', () async {
      final viewModel = TenantAdminViewModel(
        repository: _FakeTenantAdminRepository(
          dashboard: TenantAdminDashboard.fromJson(_dashboardJson()),
        ),
      );
      addTearDown(viewModel.dispose);

      await Future<void>.delayed(const Duration(milliseconds: 20));

      expect(viewModel.state.hasData, isTrue);
      expect(viewModel.state.dashboard?.activeStudentsCount, 412);
      expect(viewModel.state.error, isNull);
    });

    test('surfaces forbidden errors as denied', () async {
      final viewModel = TenantAdminViewModel(
        repository: _FakeTenantAdminRepository(
          failure: const ApiException(
            kind: ApiErrorKind.forbidden,
            message: 'Tenant admins only.',
          ),
        ),
      );
      addTearDown(viewModel.dispose);

      await Future<void>.delayed(const Duration(milliseconds: 20));

      expect(viewModel.state.hasData, isFalse);
      expect(viewModel.state.isDenied, isTrue);
    });
  });

  group('TenantAdminHomeScreen', () {
    testWidgets('renders API dashboard KPIs and branches', (tester) async {
      await _pumpAdminScreen(
        tester,
        _FakeTenantAdminRepository(
          dashboard: TenantAdminDashboard.fromJson(_dashboardJson()),
        ),
      );

      expect(find.text('Tenant-wide overview'), findsOneWidget);
      expect(find.text('Baneshwor'), findsOneWidget);
      expect(find.text('Lalitpur'), findsOneWidget);
    });

    testWidgets('shows access denied for non tenant admins', (tester) async {
      await _pumpAdminScreen(
        tester,
        _FakeTenantAdminRepository(
          failure: const ApiException(
            kind: ApiErrorKind.forbidden,
            message: 'Tenant admins only.',
          ),
        ),
      );

      expect(find.text('Access denied'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });
}
