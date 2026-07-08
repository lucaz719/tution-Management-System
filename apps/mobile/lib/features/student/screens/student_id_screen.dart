import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:tms_mobile/core/theme/app_colors.dart';
import 'package:tms_mobile/shared/data/mock_portal_data.dart';

class StudentIdScreen extends StatelessWidget {
  const StudentIdScreen({super.key});

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
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                  side: const BorderSide(color: Color(0xFFD7DFEA), width: 2),
                ),
                elevation: 4,
                shadowColor: kColorPrimary.withOpacity(0.18),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Header band representing institution branding
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: const BoxDecoration(
                        color: kColorPrimary,
                        borderRadius: BorderRadius.vertical(
                          top: Radius.circular(22),
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.school_rounded,
                            color: Colors.white,
                            size: 28,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Pinnacle Tuition Academy',
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium
                                      ?.copyWith(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w800,
                                      ),
                                ),
                                Text(
                                  'Baneshwor, Kathmandu',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(
                                        color: Colors.white.withOpacity(0.8),
                                      ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Body of the ID Card
                    Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          // Student Avatar
                          CircleAvatar(
                            radius: 56,
                            backgroundColor: kColorPrimary.withOpacity(0.1),
                            child: const Icon(
                              Icons.person_rounded,
                              size: 64,
                              color: kColorPrimary,
                            ),
                          ),
                          const SizedBox(height: 16),
                          // Student Name
                          Text(
                            profile.name,
                            style: Theme.of(context)
                                .textTheme
                                .displayMedium
                                ?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 6),
                          // Roll No & Class
                          Text(
                            '${profile.grade} • Roll No: ${profile.rollNo}',
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(
                                  color: kColorPrimaryLight,
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                          const SizedBox(height: 24),
                          // Detail fields
                          _IdDetailRow(
                            label: 'Student ID',
                            value: profile.enrollmentId,
                          ),
                          const Divider(height: 20),
                          _IdDetailRow(
                            label: 'Academic Year',
                            value: profile.academicYear,
                          ),
                          const Divider(height: 20),
                          _IdDetailRow(
                            label: 'Valid Until',
                            value: '2027-03-31',
                          ),
                          const SizedBox(height: 28),
                          // Barcode mockup
                          Column(
                            children: [
                              Container(
                                height: 50,
                                width: double.infinity,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  border: Border.all(
                                    color: Colors.black,
                                    width: 1.5,
                                  ),
                                ),
                                child: Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceEvenly,
                                  children: List.generate(
                                    35,
                                    (index) => Container(
                                      width: (index % 3 == 0)
                                          ? 4
                                          : (index % 5 == 0)
                                              ? 6
                                              : 2,
                                      color: Colors.black,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                profile.enrollmentId,
                                style: const TextStyle(
                                  letterSpacing: 6,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
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
                            content: Text(
                              'Offline saving is simulated. ID saved to device.',
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.download_rounded),
                      label: const Text('Save Offline'),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kColorPrimary,
                        minimumSize: const Size.fromHeight(50),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Sent print command to network printer...',
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.print_rounded),
                      label: const Text('Print Card'),
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
                color: kColorText.withOpacity(0.68),
                fontWeight: FontWeight.w600,
              ),
        ),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
      ],
    );
  }
}
