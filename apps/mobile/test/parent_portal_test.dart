import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tms_mobile/core/network/api_client.dart';
import 'package:tms_mobile/core/providers/feature_flags_provider.dart';
import 'package:tms_mobile/features/parent/data/parent_portal_repository.dart';
import 'package:tms_mobile/features/parent/models/parent_portal.dart';
import 'package:tms_mobile/features/parent/screens/parent_academics_screen.dart';
import 'package:tms_mobile/features/parent/screens/parent_attendance_screen.dart';
import 'package:tms_mobile/features/parent/screens/parent_fees_screen.dart';
import 'package:tms_mobile/features/parent/screens/parent_home_screen.dart';
import 'package:tms_mobile/features/parent/viewmodels/parent_portal_viewmodel.dart';

Map<String, dynamic> _portalJson({
  String selectedId = 'student-1',
  String selectedName = 'API Child One',
}) =>
    {
      'bookingWindowHours': 36,
      'children': [
        {
          'id': 'student-1',
          'name': 'API Child One',
          'initials': 'AO',
          'grade': 'Grade 8',
          'branch': 'Baneshwor',
          'rollNumber': 'ABC123',
          'blocked': false,
          'attendanceRate': 80,
          'outstanding': 4250,
        },
        {
          'id': 'student-2',
          'name': 'API Child Two',
          'initials': 'AT',
          'grade': 'Grade 5',
          'branch': 'Lalitpur',
          'rollNumber': 'DEF456',
          'blocked': false,
          'attendanceRate': 100,
          'outstanding': 0,
        },
      ],
      'selected': {
        'id': selectedId,
        'name': selectedName,
        'initials': selectedId == 'student-1' ? 'AO' : 'AT',
        'grade': selectedId == 'student-1' ? 'Grade 8' : 'Grade 5',
        'branch': selectedId == 'student-1' ? 'Baneshwor' : 'Lalitpur',
        'rollNumber': selectedId == 'student-1' ? 'ABC123' : 'DEF456',
        'blocked': false,
        'attendanceRate': selectedId == 'student-1' ? 80 : 100,
        'outstanding': selectedId == 'student-1' ? 4250 : 0,
      },
      'sessions': [
        {
          'id': 'session-api',
          'time': '09:00',
          'endTime': '10:00',
          'subject': 'API Mathematics',
          'teacher': 'API Teacher',
          'room': 'API Room',
          'type': 'Regular',
        },
      ],
      'attendance': [
        {
          'id': 'attendance-1',
          'date': '6 Sep 2026',
          'subject': 'API Mathematics',
          'session': 'Morning API Class',
          'state': 'Present',
        },
        {
          'id': 'attendance-2',
          'date': '5 Sep 2026',
          'subject': 'API Science',
          'session': 'Afternoon API Class',
          'state': 'Absent (Excused)',
        },
      ],
      'invoices': [
        {
          'id': 'invoice-api',
          'cycle': 'September 2026',
          'dueDate': '20 Sep 2026',
          'state': 'Due soon',
          'reference': 'API-REF',
          'netPayable': 4250,
          'qrAvailable': true,
          'lines': [
            {'label': 'API tuition dues', 'amount': 4250},
          ],
        },
      ],
      'remarks': [
        {
          'id': 'remark-api',
          'subject': 'API Science',
          'author': 'API Teacher',
          'message': 'API progress remark',
          'date': '6 Sep 2026',
          'signal': 'Improving',
        },
      ],
      'leaves': const [],
      'events': const [],
      'notifications': const [],
    };

class _FakeParentPortalRepository extends ParentPortalRepository {
  _FakeParentPortalRepository() : super(dio: Dio());

  final List<String?> selectedIds = [];

  @override
  Future<ParentPortal> fetchPortal({
    String? studentId,
    CancelToken? cancelToken,
  }) async {
    selectedIds.add(studentId);
    await Future<void>.delayed(Duration.zero);
    return ParentPortal.fromJson(
      _portalJson(
        selectedId: studentId ?? 'student-1',
        selectedName:
            studentId == 'student-2' ? 'API Child Two' : 'API Child One',
      ),
    );
  }
}

Future<void> _pumpPortalScreen(
  WidgetTester tester,
  Widget screen,
  _FakeParentPortalRepository repository,
) async {
  SharedPreferences.setMockInitialValues({});
  tester.view.physicalSize = const Size(900, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        parentPortalProvider.overrideWith(
          (ref) => ParentPortalViewModel(repository: repository),
        ),
        featureFlagsProvider.overrideWith(
          (ref) => FeatureFlagsNotifier('PARENT'),
        ),
      ],
      child: MaterialApp(home: screen),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 50));
}

void main() {
  group('ParentPortalRepository', () {
    test('sends authorized student selector and parses portal DTOs', () async {
      final dio = ApiClient.buildDio(
        baseUrl: 'https://test.invalid',
        extraInterceptors: [
          InterceptorsWrapper(
            onRequest: (options, handler) {
              expect(options.path, ParentPortalRepository.portalPath);
              expect(options.method, 'GET');
              expect(options.queryParameters, {'studentId': 'student-2'});
              handler.resolve(
                Response<dynamic>(
                  requestOptions: options,
                  statusCode: 200,
                  data: _portalJson(
                    selectedId: 'student-2',
                    selectedName: 'API Child Two',
                  ),
                ),
              );
            },
          ),
        ],
      );

      final portal = await ParentPortalRepository(dio: dio)
          .fetchPortal(studentId: 'student-2');

      expect(portal.selected?.id, 'student-2');
      expect(portal.children, hasLength(2));
      expect(portal.sessions.single.subject, 'API Mathematics');
      expect(portal.presentCount, 1);
      expect(portal.absentCount, 1);
      expect(portal.outstandingTotal, 4250);
      expect(portal.bookingWindowHours, 36);
    });
  });

  test('parent portal provider keeps child selection for the session',
      () async {
    final repository = _FakeParentPortalRepository();
    final container = ProviderContainer(
      overrides: [
        parentPortalProvider.overrideWith(
          (ref) => ParentPortalViewModel(repository: repository),
        ),
      ],
    );
    addTearDown(container.dispose);

    await Future<void>.delayed(const Duration(milliseconds: 20));
    await container
        .read(parentPortalProvider.notifier)
        .selectChild('student-2');

    expect(repository.selectedIds, [null, 'student-2']);
    expect(container.read(parentPortalProvider).selectedChildId, 'student-2');
    expect(
      container.read(parentPortalProvider).selectedChild?.name,
      'API Child Two',
    );
  });

  testWidgets('home renders API data and switches by student id',
      (tester) async {
    final repository = _FakeParentPortalRepository();
    await _pumpPortalScreen(tester, const ParentHomeScreen(), repository);

    expect(find.text('API Child One'), findsWidgets);
    expect(find.text('80%'), findsOneWidget);
    expect(find.textContaining('4,250'), findsWidgets);
    expect(find.text('Aarav'), findsNothing);

    await tester.tap(find.text('API Child Two').first);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(repository.selectedIds.last, 'student-2');
    expect(find.text('100%'), findsOneWidget);
  });

  testWidgets('attendance renders API records without demo dates',
      (tester) async {
    await _pumpPortalScreen(
      tester,
      const ParentAttendanceScreen(),
      _FakeParentPortalRepository(),
    );

    expect(find.text('6 Sep 2026'), findsOneWidget);
    expect(find.textContaining('Morning API Class'), findsOneWidget);
    expect(find.text('Fri, Jul 18'), findsNothing);
  });

  testWidgets('fees renders API invoices without demo statements',
      (tester) async {
    await _pumpPortalScreen(
      tester,
      const ParentFeesScreen(),
      _FakeParentPortalRepository(),
    );

    expect(find.textContaining('September 2026'), findsWidgets);
    expect(find.textContaining('4,250'), findsWidgets);
    expect(find.textContaining('July 2026'), findsNothing);
  });

  testWidgets('academics renders API remarks without demo curriculum',
      (tester) async {
    await _pumpPortalScreen(
      tester,
      const ParentAcademicsScreen(),
      _FakeParentPortalRepository(),
    );

    expect(find.text('API progress remark'), findsOneWidget);
    expect(find.text('API Science'), findsWidgets);
    expect(find.text('Algebraic Expressions'), findsNothing);
  });
}
