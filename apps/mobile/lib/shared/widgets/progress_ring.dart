import 'dart:math';
import 'package:flutter/material.dart';
import 'package:tms_mobile/core/theme/app_colors.dart';

/// Animated circular progress ring — Flutter equivalent of the web ProgressRing.
///
/// Shows a percentage arc that animates from 0 → [percent] on first build.
/// Used in dashboards for attendance rates, collection targets, etc.
class ProgressRing extends StatefulWidget {
  const ProgressRing({
    super.key,
    required this.percent,
    this.size = 80,
    this.strokeWidth = 8,
    this.color,
    this.backgroundColor,
    this.label,
    this.centerText,
    this.animated = true,
  });

  /// Value between 0.0 and 1.0.
  final double percent;

  /// Diameter of the ring.
  final double size;

  /// Thickness of the ring stroke.
  final double strokeWidth;

  /// Color of the filled arc. Defaults to accent (Golden Orange).
  final Color? color;

  /// Color of the background arc. Defaults to a light gray.
  final Color? backgroundColor;

  /// Text displayed below the ring.
  final String? label;

  /// Text displayed inside the ring (e.g. "85%"). If null, shows percent.
  final String? centerText;

  /// Whether to animate the arc on first build.
  final bool animated;

  @override
  State<ProgressRing> createState() => _ProgressRingState();
}

class _ProgressRingState extends State<ProgressRing>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    );

    if (widget.animated) {
      _controller.forward();
    } else {
      _controller.value = 1.0;
    }
  }

  @override
  void didUpdateWidget(covariant ProgressRing oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.percent != widget.percent) {
      _controller.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final displayText =
        widget.centerText ?? '${(widget.percent * 100).round()}%';

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        AnimatedBuilder(
          animation: _animation,
          builder: (context, child) {
            return SizedBox(
              width: widget.size,
              height: widget.size,
              child: CustomPaint(
                painter: _RingPainter(
                  percent: widget.percent * _animation.value,
                  strokeWidth: widget.strokeWidth,
                  color: widget.color ?? kColorAccent,
                  backgroundColor: widget.backgroundColor ??
                      kColorText.withValues(alpha: 0.08),
                ),
                child: Center(
                  child: Text(
                    displayText,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontSize: widget.size * 0.2,
                          fontWeight: FontWeight.w700,
                          color: kColorText,
                        ),
                  ),
                ),
              ),
            );
          },
        ),
        if (widget.label != null) ...[
          const SizedBox(height: 8),
          Text(
            widget.label!,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: kColorText.withValues(alpha: 0.65),
                ),
            textAlign: TextAlign.center,
          ),
        ],
      ],
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({
    required this.percent,
    required this.strokeWidth,
    required this.color,
    required this.backgroundColor,
  });

  final double percent;
  final double strokeWidth;
  final Color color;
  final Color backgroundColor;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;

    // Background arc (full circle).
    final bgPaint = Paint()
      ..color = backgroundColor
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, bgPaint);

    // Foreground arc.
    if (percent > 0) {
      final fgPaint = Paint()
        ..color = color
        ..strokeWidth = strokeWidth
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;

      final sweepAngle = 2 * pi * percent.clamp(0.0, 1.0);
      const startAngle = -pi / 2; // Start from top.

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepAngle,
        false,
        fgPaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _RingPainter oldDelegate) {
    return oldDelegate.percent != percent ||
        oldDelegate.color != color ||
        oldDelegate.backgroundColor != backgroundColor;
  }
}
