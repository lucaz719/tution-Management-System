/// Repository backing the student digital ID, calendar and notifications
/// inbox screens (MOB-104).
///
/// All data comes from the single authenticated
/// `GET /api/users/me/student-portal` call via [StudentPortalRepository]
/// (identity from the Better Auth session cookie; the client never sends
/// user/tenant/branch ids; GET-only so the shared retry interceptor may
/// safely retry). Reuses the sibling-owned portal repository — no duplicate
/// endpoints or DTOs.
///
/// Verified in `services/api/src` (read-only):
/// - Wired: `GET /api/users/me/student-portal` (`routes/users.ts`) carries
///   `studentProfile` (ID), `events` (calendar) and derived `notifications`.
/// - Missing: no dedicated digital-ID endpoint, no standalone calendar
///   endpoint, and no notification mark-read endpoint — read state is local
///   (see the notifications ViewModel TODO). Missing surface as typed
///   [ApiException]s, never demo data.
library;

import 'package:dio/dio.dart';

import '../models/student_portal_dto.dart';
import 'student_portal_repository.dart';

/// Status of the digital ID, derived from live scoped server data.
///
/// Rules:
/// - [suspended] when the server flags the profile `blocked` (set when an
///   enrollment is `BLOCKED` or any invoice is `OVERDUE`).
/// - [active] otherwise; unpaid dues are surfaced as a notice, not a block.
enum StudentIdStatus { active, suspended }

/// Digital ID card derived from the live portal profile.
class StudentIdCard {
  const StudentIdCard({
    required this.profile,
    required this.status,
    required this.statusReason,
    required this.validityLabel,
  });

  /// Live scoped profile from the server (name, grade, branch, roll number,
  /// enrollment id, academic year, blocked flag, dues, attendance).
  final PortalProfile profile;

  final StudentIdStatus status;

  /// Human-readable reason for the current status.
  final String statusReason;

  /// Validity line. The backend sends `validUntil: 'While actively
  /// enrolled'` (no expiry date), so validity is the academic year bound to
  /// active enrollment — never an invented date.
  final String validityLabel;

  bool get isSuspended => status == StudentIdStatus.suspended;
}

StudentIdCard buildIdCard(PortalProfile profile) {
  if (profile.blocked) {
    return StudentIdCard(
      profile: profile,
      status: StudentIdStatus.suspended,
      statusReason:
          'Suspended — enrollment blocked or a fee is overdue. Contact the front office.',
      validityLabel:
          'AY ${profile.academicYear} · while actively enrolled (suspended)',
    );
  }
  final duesNote = profile.outstanding > 0
      ? ' · NPR ${profile.outstanding.toStringAsFixed(0)} dues pending'
      : '';
  return StudentIdCard(
    profile: profile,
    status: StudentIdStatus.active,
    statusReason: 'Active$duesNote',
    validityLabel:
        'AY ${profile.academicYear} · while actively enrolled',
  );
}

class StudentIdCalendarNotificationsRepository {
  StudentIdCalendarNotificationsRepository({
    StudentPortalRepository? portalRepository,
  }) : _portal = portalRepository ?? StudentPortalRepository();

  final StudentPortalRepository _portal;

  Future<StudentIdCard> fetchIdCard({CancelToken? cancelToken}) async {
    final portal = await _portal.fetchPortal(cancelToken: cancelToken);
    return buildIdCard(portal.profile);
  }

  /// Portal calendar events (backend `academicEvent` rows scoped to the
  /// student's branches), sorted by day/month as received.
  Future<List<PortalEvent>> fetchEvents({CancelToken? cancelToken}) async {
    final portal = await _portal.fetchPortal(cancelToken: cancelToken);
    return List<PortalEvent>.unmodifiable(portal.events);
  }

  /// Derived inbox (fee, homework, result, attendance, leave and certificate
  /// notices, newest first as returned by the server).
  Future<List<PortalNotification>> fetchNotifications({
    CancelToken? cancelToken,
  }) async {
    final portal = await _portal.fetchPortal(cancelToken: cancelToken);
    return List<PortalNotification>.unmodifiable(portal.notifications);
  }
}
