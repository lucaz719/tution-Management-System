import 'dart:async';
import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'sync_models.dart';

/// Socket-check connectivity monitor, exposed as a Riverpod provider.
///
/// Choice justification: a TCP connect to the API host proves *usable*
/// connectivity, whereas `connectivity_plus` only reports the network
/// interface type (Wi-Fi icon ≠ working internet, captive portals lie) and
/// needs native plugin implementations per platform. This monitor has zero
/// native dependencies and is faked in tests via [connectivityCheckOverride].
class ConnectivityMonitor extends StateNotifier<ConnectivityState> {
  final Future<bool> Function() _check;
  final Duration interval;
  Timer? _timer;
  bool _disposed = false;

  ConnectivityMonitor({
    Future<bool> Function()? check,
    this.interval = const Duration(seconds: 15),
    bool autostart = true,
  })  : _check = check ?? _defaultCheck,
        super(ConnectivityState.online) {
    if (autostart) start();
  }

  /// Default check: TCP connect to the API host, 3s timeout.
  static Future<bool> _defaultCheck() async {
    const host = String.fromEnvironment('API_BASE_URL',
        defaultValue: 'http://10.0.2.2:3001');
    final uri = Uri.tryParse(host);
    final target = (uri != null && uri.hasAuthority) ? uri.host : host;
    final port = (uri != null && uri.hasAuthority)
        ? (uri.hasPort ? uri.port : (uri.scheme == 'https' ? 443 : 80))
        : 3001;
    try {
      final socket =
          await Socket.connect(target, port, timeout: const Duration(seconds: 3));
      socket.destroy();
      return true;
    } catch (_) {
      return false;
    }
  }

  void start() {
    _timer ??= Timer.periodic(interval, (_) => refresh());
  }

  /// Run one check now and publish the result.
  Future<ConnectivityState> refresh() async {
    final ok = await _check();
    if (!_disposed) state = ok ? ConnectivityState.online : ConnectivityState.offline;
    return state;
  }

  /// Test/app hook: force a state (e.g. from AppLifecycle or a manual toggle).
  void setForTest(ConnectivityState value) {
    if (!_disposed) state = value;
  }

  @override
  void dispose() {
    _disposed = true;
    _timer?.cancel();
    super.dispose();
  }
}

/// Override the check function in tests / demos.
final connectivityCheckOverrideProvider =
    Provider<Future<bool> Function()?>((ref) => null);

final connectivityMonitorProvider =
    StateNotifierProvider<ConnectivityMonitor, ConnectivityState>((ref) {
  final override = ref.watch(connectivityCheckOverrideProvider);
  return ConnectivityMonitor(check: override);
});
