import 'package:flutter/material.dart';

import '../data/student_demo_data.dart';
import '../student_design.dart';
import '../widgets/student_scaffold.dart';

class StudentCertificatesScreen extends StatelessWidget {
  const StudentCertificatesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return StudentScaffold(
      title: 'Certificates',
      body: ListView(
        padding: const EdgeInsets.all(StudentSpace.md),
        children: [
          Container(
            padding: const EdgeInsets.all(StudentSpace.md),
            decoration: BoxDecoration(
              color: StudentColors.success.withOpacity(.08),
              borderRadius: BorderRadius.circular(StudentRadius.card),
            ),
            child: const Row(
              children: [
                Icon(Icons.verified_rounded, color: StudentColors.success),
                SizedBox(width: StudentSpace.sm),
                Expanded(
                  child: Text(
                    'Issued certificates stay in your history and can be downloaded anytime.',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: StudentSpace.lg),
          for (final certificate in StudentDemoData.certificates) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(StudentSpace.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color:
                                StudentColors.primary.withOpacity(.08),
                            borderRadius:
                                BorderRadius.circular(StudentRadius.control),
                          ),
                          child: const Icon(
                            Icons.workspace_premium_outlined,
                            color: StudentColors.primary,
                          ),
                        ),
                        const SizedBox(width: StudentSpace.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                certificate.title,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              const SizedBox(height: StudentSpace.xxs),
                              Text(
                                '${certificate.course}\nIssued ${certificate.issuedAt.day}/${certificate.issuedAt.month}/${certificate.issuedAt.year}',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: StudentSpace.md),
                    const Divider(height: 1),
                    const SizedBox(height: StudentSpace.sm),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            certificate.id,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  '${certificate.fileName} download started.',
                                ),
                              ),
                            );
                          },
                          icon: const Icon(Icons.download_rounded),
                          label: const Text('Download PDF'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: StudentSpace.sm),
          ],
        ],
      ),
    );
  }
}
