/// Geo-attendance ViewModel: client-side radius UX, server-authoritative records.
///
/// The radius check here is UX-only (button enablement + distance readout).
/// The record is created by `POST /api/attendance/in|out`, where the server
/// re-validates GPS accuracy (<=20m), the branch geofence and pending daily
/// updates — never trust client coordinates for records.
library;

import 'dart:math' as math;

import 'package:flutter/foundation.dart';

import 'package:tms_mobile/core/network/api_exception.dart';
import 'package:tms_mobile/core/network/request_cancellation.dart';
import 'package:tms_mobile/core/viewmodel/base_viewmodel.dart';
import 'package:tms_mobile/features/teacher/data/teacher_portal_repository.dart';

/// Haversine distance in meters between two WGS84 points.
double distanceMeters(
  double latA,
  double lngA,
  double latB,
  double lngB,
) {
  const earthRadius = 6371000.0;
  final dLat = _radians(latB - latA);
  final dLng = _radians(lngB - lngA);
  final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(_radians(latA)) *
          math.cos(_radians(latB)) *
          math.sin(dLng / 2) *
          math.sin(dLng / 2);
  return 2 * earthRadius * math.asin(math.sqrt(a));
}

double _radians(double degrees) => degrees * math.pi / 180.0;

@immutable
class GeoAttendanceState extends ViewModelState {
  const GeoAttendanceState({
    this.latitude,
    this.longitude,
    this.gpsAccuracy,
    this.locationUnavailable = false,
    this.permissionDenied = false,
    this.distanceMeters,
    this.isMarking = false,
    this.lastResult,
    this.errorKind,
    super.error,
    super.isLoading,
  });

  final double? latitude;
  final double? longitude;
  final double? gpsAccuracy;
  final bool locationUnavailable;
  final bool permissionDenied;
  final double? distanceMeters;
  final bool isMarking;
  final String? lastResult;
  final ApiErrorKind? errorKind;

  bool get hasFix => latitude != null && longitude != null;
  bool get isOffline => errorKind == ApiErrorKind.noConnection;
  bool get isDenied => errorKind == ApiErrorKind.forbidden;

  GeoAttendanceState copyWith({
    double? latitude,
    double? longitude,
    double? gpsAccuracy,
    bool? locationUnavailable,
    bool? permissionDenied,
    double? distanceMeters,
    bool clearDistance = false,
    bool? isMarking,
    String? lastResult,
    bool clearLastResult = false,
    ApiErrorKind? errorKind,
    bool clearErrorKind = false,
    bool? isLoading,
    String? error,
    bool clearError = false,
  }) {
    return GeoAttendanceState(
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      gpsAccuracy: gpsAccuracy ?? this.gpsAccuracy,
      locationUnavailable: locationUnavailable ?? this.locationUnavailable,
      permissionDenied: permissionDenied ?? this.permissionDenied,
      distanceMeters:
          clearDistance ? null : (distanceMeters ?? this.distanceMeters),
      isMarking: isMarking ?? this.isMarking,
      lastResult: clearLastResult ? null : (lastResult ?? this.lastResult),
      errorKind: clearErrorKind ? null : (errorKind ?? this.errorKind),
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class GeoAttendanceViewModel extends BaseViewModel<GeoAttendanceState> {
  GeoAttendanceViewModel({
    TeacherPortalRepository? repository,
    RequestCanceller? canceller,
    required this.branchId,
    required this.branchLatitude,
    required this.branchLongitude,
    required this.branchRadiusMeters,
  })  : _repository = repository ?? TeacherPortalRepository(),
        _canceller = canceller ?? RequestCanceller(),
        super(const GeoAttendanceState());

  final TeacherPortalRepository _repository;
  final RequestCanceller _canceller;

  /// Branch geofence from the workspace payload. Center coordinates are
  /// not exposed by `GET /api/teacher/workspace`, so they are nullable:
  /// when unknown the radius readout is hidden and the server (which holds
  /// the branch center) remains the sole authority.
  final String branchId;
  final double? branchLatitude;
  final double? branchLongitude;
  final double branchRadiusMeters;

  /// UX-only radius evaluation. Returns true when the fix is inside the
  /// branch radius; the server still decides the record.
  bool get insideRadius {
    final d = state.distanceMeters;
    return d != null && d <= branchRadiusMeters;
  }

  /// Null when the branch center is unknown to the client (server verifies).
  bool? get insideRadiusOrUnknown {
    if (branchLatitude == null || branchLongitude == null) return null;
    final d = state.distanceMeters;
    if (d == null) return null;
    return d <= branchRadiusMeters;
  }

  bool get canMark {
    if (!state.hasFix || state.isMarking || state.locationUnavailable) {
      return false;
    }
    // Branch center unknown to the client: leave the decision to the
    // server (authoritative) and keep the button enabled.
    final radius = insideRadiusOrUnknown;
    if (radius == null) return true;
    return radius;
  }

  void updatePosition({
    required double latitude,
    required double longitude,
    double? gpsAccuracy,
  }) {
    final centerLat = branchLatitude;
    final centerLng = branchLongitude;
    state = state.copyWith(
      latitude: latitude,
      longitude: longitude,
      gpsAccuracy: gpsAccuracy,
      locationUnavailable: false,
      distanceMeters: centerLat == null || centerLng == null
          ? null
          : distanceMeters(latitude, longitude, centerLat, centerLng),
      clearError: true,
      clearErrorKind: true,
    );
  }

  void setLocationUnavailable({bool permissionDenied = false}) {
    state = state.copyWith(
      locationUnavailable: true,
      permissionDenied: permissionDenied,
      clearDistance: true,
    );
  }

  Future<bool> markIn() => _mark(
        () => _repository.markGeoIn(
          branchId: branchId,
          latitude: state.latitude!,
          longitude: state.longitude!,
          gpsAccuracy: state.gpsAccuracy ?? 0,
          cancelToken: _canceller.tokenFor('geo-in'),
        ),
        successLabel: 'Marked IN — confirmed by server.',
      );

  Future<bool> markOut() => _mark(
        () => _repository.markGeoOut(
          branchId: branchId,
          latitude: state.latitude!,
          longitude: state.longitude!,
          gpsAccuracy: state.gpsAccuracy ?? 0,
          cancelToken: _canceller.tokenFor('geo-out'),
        ),
        successLabel: 'Marked OUT — confirmed by server.',
      );

  Future<bool> _mark(
    Future<Map<String, dynamic>> Function() call, {
    required String successLabel,
  }) async {
    if (!state.hasFix) {
      state = state.copyWith(
          error: 'Waiting for a GPS fix — try again in a moment.');
      return false;
    }
    state =
        state.copyWith(isMarking: true, clearError: true, clearErrorKind: true);
    try {
      final result = await call();
      state = state.copyWith(
        isMarking: false,
        lastResult: (result['message'] as String?) ?? successLabel,
        clearError: true,
        clearErrorKind: true,
      );
      return true;
    } on ApiException catch (error) {
      if (error.kind == ApiErrorKind.cancelled) {
        state = state.copyWith(isMarking: false);
        return false;
      }
      state = state.copyWith(
        isMarking: false,
        error: error.message,
        errorKind: error.kind,
      );
      return false;
    }
  }

  @override
  void dispose() {
    _canceller.cancelAll();
    super.dispose();
  }
}
