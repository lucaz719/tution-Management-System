import 'package:flutter/material.dart';

/// Presents the client-side geofence estimate without implying that the
/// client creates an attendance record. A null [insideRadius] means the API
/// did not share the branch center, so eligibility is left to the server.
class GeoRadiusCard extends StatelessWidget {
  const GeoRadiusCard({
    super.key,
    required this.distanceMeters,
    required this.radiusMeters,
    required this.insideRadius,
    this.gpsAccuracy,
  });

  final double? distanceMeters;
  final double radiusMeters;
  final bool? insideRadius;
  final double? gpsAccuracy;

  @override
  Widget build(BuildContext context) {
    final distance = distanceMeters;
    final inside = insideRadius;
    final Color color;
    final IconData icon;
    final String title;
    final String detail;

    if (inside == null) {
      color = Theme.of(context).colorScheme.primary;
      icon = Icons.cloud_done_outlined;
      title = 'Distance checked by server';
      detail =
          'Branch center is not shared with the app. The server verifies your position before recording attendance.';
    } else if (inside) {
      color = Colors.green;
      icon = Icons.location_on_rounded;
      title = '${distance!.round()} m from branch';
      detail = 'Inside ${radiusMeters.round()} m geofence';
    } else {
      color = Theme.of(context).colorScheme.error;
      icon = Icons.location_off_rounded;
      title = '${distance!.round()} m from branch';
      detail = 'Outside ${radiusMeters.round()} m geofence';
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: color,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(detail),
                  if (gpsAccuracy != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      'GPS accuracy: ±${gpsAccuracy!.round()} m',
                      style: Theme.of(context).textTheme.bodySmall,
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
