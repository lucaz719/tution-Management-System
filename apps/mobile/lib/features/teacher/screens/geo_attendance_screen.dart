import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:tms_mobile/core/theme/app_colors.dart';
import 'package:tms_mobile/core/utils/formatters.dart';
import 'package:tms_mobile/features/teacher/models/teacher_models.dart';
import 'package:tms_mobile/features/teacher/widgets/geo_status_indicator.dart';

class GeoAttendanceScreen extends StatefulWidget {
  const GeoAttendanceScreen({super.key, required this.session});

  final TeacherClassSession session;

  @override
  State<GeoAttendanceScreen> createState() => _GeoAttendanceScreenState();
}

class _GeoAttendanceScreenState extends State<GeoAttendanceScreen> {
  static const double _branchLatitude = 27.6915;
  static const double _branchLongitude = 85.3420;
  static const double _branchRadiusMeters = 100;
  static const Duration _gracePeriod = Duration(minutes: 5);

  StreamSubscription<Position>? _positionSubscription;
  Timer? _ticker;
  GeoFenceStatus _status = GeoFenceStatus.checking;
  Position? _lastPosition;
  DateTime? _lastCheckedAt;
  DateTime? _markedInAt;
  DateTime? _outsideSince;
  bool _isUpdating = false;
  bool _permissionDenied = false;
  List<AttendanceStamp> _history = <AttendanceStamp>[];

  bool get _isMarkedIn => _markedInAt != null;
  bool get _canMarkIn => !_isUpdating && _status == GeoFenceStatus.inside;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _history = <AttendanceStamp>[
      AttendanceStamp(
        kind: AttendanceStampKind.markIn,
        at: DateTime(now.year, now.month, now.day, 9, 0),
      ),
      AttendanceStamp(
        kind: AttendanceStampKind.markOut,
        at: DateTime(now.year, now.month, now.day, 10, 30),
      ),
    ];
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _onTick());
    _initialiseLocation();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _positionSubscription?.cancel();
    super.dispose();
  }

  void _onTick() {
    if (!mounted) return;
    if (_isMarkedIn &&
        _outsideSince != null &&
        DateTime.now().difference(_outsideSince!) >= _gracePeriod &&
        !_isUpdating) {
      _markOut(auto: true);
      return;
    }
    setState(() {});
  }

  Future<void> _initialiseLocation() async {
    final lastKnown = await Geolocator.getLastKnownPosition();
    if (lastKnown != null) {
      _lastPosition = lastKnown;
      _lastCheckedAt = lastKnown.timestamp.toLocal();
    }

    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      setState(() => _status = GeoFenceStatus.unavailable);
      return;
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      setState(() {
        _permissionDenied = true;
        _status = GeoFenceStatus.unavailable;
      });
      return;
    }

    _permissionDenied = false;

    final currentPosition = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.best,
    );
    _updateFromPosition(currentPosition);

    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.best,
        distanceFilter: 10,
      ),
    ).listen(
      _updateFromPosition,
      onError: (_) {
        if (mounted) {
          setState(() => _status = GeoFenceStatus.unavailable);
        }
      },
    );
  }

  void _updateFromPosition(Position position) {
    final distance = Geolocator.distanceBetween(
      position.latitude,
      position.longitude,
      _branchLatitude,
      _branchLongitude,
    );
    final accurateEnough = position.accuracy <= 20;
    final nextStatus = !accurateEnough
        ? GeoFenceStatus.unavailable
        : distance <= _branchRadiusMeters
            ? GeoFenceStatus.inside
            : GeoFenceStatus.outside;

    setState(() {
      _lastPosition = position;
      _lastCheckedAt = position.timestamp.toLocal();
      _status = nextStatus;
      if (_isMarkedIn) {
        if (nextStatus == GeoFenceStatus.outside) {
          _outsideSince ??= DateTime.now();
        } else if (nextStatus == GeoFenceStatus.inside) {
          _outsideSince = null;
        }
      }
    });
  }

  Future<void> _markIn() async {
    if (!_canMarkIn) {
      return;
    }

    setState(() => _isUpdating = true);
    await Future<void>.delayed(const Duration(milliseconds: 400));
    final now = DateTime.now();
    setState(() {
      _markedInAt = now;
      _outsideSince = null;
      _history = [
        ..._history,
        AttendanceStamp(
          kind:
              _history.any((stamp) => stamp.kind == AttendanceStampKind.markIn)
                  ? AttendanceStampKind.reIn
                  : AttendanceStampKind.markIn,
          at: now,
        ),
      ];
      _isUpdating = false;
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Attendance marked in successfully.')),
      );
    }
  }

  Future<void> _markOut({bool auto = false}) async {
    if (!_isMarkedIn) {
      return;
    }

    setState(() => _isUpdating = true);
    await Future<void>.delayed(const Duration(milliseconds: 400));
    final now = DateTime.now();
    setState(() {
      _history = [
        ..._history,
        AttendanceStamp(
          kind:
              auto ? AttendanceStampKind.autoOut : AttendanceStampKind.markOut,
          at: now,
        ),
      ];
      _markedInAt = null;
      _outsideSince = null;
      _isUpdating = false;
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            auto
                ? 'Auto-departure recorded after leaving the branch radius.'
                : 'Attendance marked out successfully.',
          ),
        ),
      );
    }
  }

  Duration get _activeSessionDuration {
    if (_markedInAt == null) {
      return Duration.zero;
    }
    return DateTime.now().difference(_markedInAt!);
  }

  Duration get _graceRemaining {
    if (_outsideSince == null) {
      return _gracePeriod;
    }
    final remaining = _gracePeriod - DateTime.now().difference(_outsideSince!);
    return remaining.isNegative ? Duration.zero : remaining;
  }

  Duration get _totalTimeOnPremises {
    Duration total = Duration.zero;
    DateTime? activeStart;

    for (final stamp in _history) {
      if (stamp.kind == AttendanceStampKind.markIn ||
          stamp.kind == AttendanceStampKind.reIn) {
        activeStart = stamp.at;
      } else if (activeStart != null) {
        total += stamp.at.difference(activeStart);
        activeStart = null;
      }
    }

    if (activeStart != null) {
      total += DateTime.now().difference(activeStart);
    }

    return total;
  }

  String get _buttonTooltip {
    if (_status == GeoFenceStatus.outside) {
      return 'Move closer to mark in';
    }
    if (_status == GeoFenceStatus.unavailable) {
      return 'Enable GPS to continue';
    }
    return '';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Geo Attendance')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            GeoStatusIndicator(status: _status, lastCheckedAt: _lastCheckedAt),
            if (_permissionDenied) ...[
              const SizedBox(height: 12),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Location permission is required to verify branch radius.',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: [
                          OutlinedButton.icon(
                            onPressed: () => Geolocator.openAppSettings(),
                            icon: const Icon(Icons.settings),
                            label: const Text('Open Settings'),
                          ),
                          OutlinedButton.icon(
                            onPressed: () => Geolocator.openLocationSettings(),
                            icon: const Icon(Icons.gps_fixed),
                            label: const Text('Location Settings'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.session.subject,
                      style: GoogleFonts.fraunces(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: kColorText),
                    ),
                    const SizedBox(height: 8),
                    Text('${widget.session.branch} • ${widget.session.room}'),
                    const SizedBox(height: 4),
                    Text(
                      'Class window: ${formatShortTime(widget.session.scheduledStart)} - ${formatShortTime(widget.session.scheduledEnd)}',
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Branch radius: ${_branchRadiusMeters.toInt()}m • Demo coordinates, replace with API',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: kColorText.withValues(alpha: 0.66),
                          ),
                    ),
                    if (_isMarkedIn) ...[
                      const SizedBox(height: 16),
                      Text('Session start time',
                          style: Theme.of(context).textTheme.bodyMedium),
                      const SizedBox(height: 4),
                      Text(
                        formatShortTime(_markedInAt!),
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 16),
                      Text('Live session timer',
                          style: Theme.of(context).textTheme.bodyMedium),
                      const SizedBox(height: 6),
                      Text(
                        formatDurationClock(_activeSessionDuration),
                        style: Theme.of(context).textTheme.displayMedium,
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            Tooltip(
              message: _buttonTooltip,
              child: SizedBox(
                height: 72,
                child: ElevatedButton(
                  onPressed: _isMarkedIn
                      ? () => _markOut()
                      : _canMarkIn
                          ? _markIn
                          : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _isMarkedIn ? kColorError : kColorAccent,
                  ),
                  child: _isUpdating
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                              strokeWidth: 2.6, color: Colors.white),
                        )
                      : Text(
                          _isMarkedIn ? 'MARK OUT' : 'MARK IN',
                          style: const TextStyle(
                              fontSize: 20, fontWeight: FontWeight.w800),
                        ),
                ),
              ),
            ),
            if (_isMarkedIn &&
                _status == GeoFenceStatus.outside &&
                _outsideSince != null) ...[
              const SizedBox(height: 16),
              Card(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF4DE),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'You have left the branch radius. Auto-departure in ${formatDurationClock(_graceRemaining)}. Tap MARK OUT to record manually.',
                    style: const TextStyle(
                        color: kColorWarning, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 16),
            Card(
              child: ExpansionTile(
                tilePadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                title: const Text(
                  'Session History',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: _lastCheckedAt != null
                    ? Text(
                        'Last GPS check: ${formatTimestamp(_lastCheckedAt!)}')
                    : const Text('Waiting for GPS update'),
                children: [
                  if (_history.isEmpty)
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text('No attendance stamps recorded today.'),
                    )
                  else
                    ..._history.map(
                      (stamp) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                stamp.label,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700),
                              ),
                            ),
                            Text(formatShortTime(stamp.at)),
                          ],
                        ),
                      ),
                    ),
                  const Divider(height: 24),
                  Text(
                    'Total in-premises time: ${formatDurationClock(_totalTimeOnPremises)}',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  if (_lastPosition != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      'Last GPS accuracy: ${_lastPosition!.accuracy.toStringAsFixed(1)}m',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
