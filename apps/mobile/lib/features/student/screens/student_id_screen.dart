import 'dart:math';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:tms_mobile/core/theme/app_colors.dart';
import 'package:tms_mobile/shared/data/mock_portal_data.dart';

class StudentIdScreen extends StatefulWidget {
  const StudentIdScreen({super.key});

  @override
  State<StudentIdScreen> createState() => _StudentIdScreenState();
}

class _StudentIdScreenState extends State<StudentIdScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _animation;
  bool _showFront = true;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _animation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOutCubic),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _flipCard() {
    if (_showFront) {
      _controller.forward();
    } else {
      _controller.reverse();
    }
    setState(() {
      _showFront = !_showFront;
    });
  }

  @override
  Widget build(BuildContext context) {
    final profile = MockPortalData.student.profile;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Digital Student ID'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.go('/student/home'),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(height: 12),
              // Flip Guidance Banner
              GestureDetector(
                onTap: _flipCard,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: kColorPrimary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.flip_rounded, size: 18, color: kColorPrimary),
                      const SizedBox(width: 8),
                      Text(
                        _showFront ? 'Tap Card to Flip to Back Side' : 'Tap Card to Flip to Front Side',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: kColorPrimary,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Animated 3D Card Container
              AnimatedBuilder(
                animation: _animation,
                builder: (context, child) {
                  final transformAngle = _animation.value * pi;
                  final isBackVisible = transformAngle >= pi / 2;

                  return Transform(
                    transform: Matrix4.identity()
                      ..setEntry(3, 2, 0.001) // 3D Perspective
                      ..rotateY(transformAngle),
                    alignment: Alignment.center,
                    child: isBackVisible
                        ? Transform(
                            transform: Matrix4.identity()..rotateY(pi),
                            alignment: Alignment.center,
                            child: _buildBackCard(context, profile),
                          )
                        : _buildFrontCard(context, profile),
                  );
                },
              ),

              const SizedBox(height: 28),

              // Action buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(50),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('ID Pass saved to Apple / Google Wallet format.'),
                          ),
                        );
                      },
                      icon: const Icon(Icons.wallet_rounded),
                      label: const Text('Add to Wallet'),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        minimumSize: const Size.fromHeight(50),
                        backgroundColor: kColorAccent,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      onPressed: _flipCard,
                      icon: const Icon(Icons.sync_rounded),
                      label: const Text('Flip ID Card'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFrontCard(BuildContext context, dynamic profile) {
    return GestureDetector(
      onTap: _flipCard,
      child: Card(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: Color(0xFFD7DFEA), width: 2),
        ),
        elevation: 6,
        shadowColor: kColorPrimary.withOpacity(0.2),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: kColorPrimary,
                borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.school_rounded, color: Colors.white, size: 28),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'TMS Tuition Academy',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        Text(
                          'Baneshwor, Kathmandu',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Colors.white.withOpacity(0.8),
                              ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 50,
                    backgroundColor: kColorPrimary.withOpacity(0.1),
                    child: const Icon(Icons.person_rounded, size: 60, color: kColorPrimary),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    profile.name,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${profile.grade} • Roll No: ${profile.rollNo}',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: kColorPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  const SizedBox(height: 20),
                  _IdDetailRow(label: 'Student ID', value: profile.enrollmentId),
                  const Divider(height: 16),
                  _IdDetailRow(label: 'Academic Year', value: profile.academicYear),
                  const Divider(height: 16),
                  _IdDetailRow(label: 'Valid Until', value: '2027-03-31'),
                  const SizedBox(height: 20),
                  // Barcode & Scannable QR Code Simulation
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: Colors.black26),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.qr_code_2_rounded, size: 48, color: kColorPrimary),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'VERIFIED ENTRY PASS',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    fontWeight: FontWeight.w800,
                                    color: kColorSuccess,
                                  ),
                            ),
                            Text(
                              profile.enrollmentId,
                              style: const TextStyle(
                                letterSpacing: 3,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBackCard(BuildContext context, dynamic profile) {
    return GestureDetector(
      onTap: _flipCard,
      child: Card(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: Color(0xFFD7DFEA), width: 2),
        ),
        elevation: 6,
        shadowColor: kColorPrimary.withOpacity(0.2),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: kColorAccent,
                borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.verified_user_rounded, color: Colors.white, size: 28),
                  const SizedBox(width: 12),
                  Text(
                    'Emergency & Security Info',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  _IdDetailRow(label: 'Emergency Contact', value: '+977 9801234567'),
                  const Divider(height: 18),
                  _IdDetailRow(label: 'Blood Group', value: 'O+ Positive'),
                  const Divider(height: 18),
                  _IdDetailRow(label: 'Authorized Branch', value: 'Baneshwor Main Center'),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: kColorSurface,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'Terms: This digital card is non-transferable and must be presented upon entering the campus or library. If found, please return to TMS Front Office.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 11),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _IdDetailRow extends StatelessWidget {
  const _IdDetailRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: kColorText.withOpacity(0.65),
              ),
        ),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: kColorText,
              ),
        ),
      ],
    );
  }
}
