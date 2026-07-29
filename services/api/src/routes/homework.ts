import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware } from '../middleware/auth';
import { canAccessBranch, isTenantAdmin } from '../utils/access-control';

const router = Router();

// 1. Create a new Homework assignment (Teacher only)
router.post(
  '/',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { classId, subject, title, description, contentUrl, deadline } = req.body;

    if (!classId || !subject || !title || !deadline) {
      return res.status(400).json({
        error: 'Missing required parameters: classId, subject, title, deadline.',
      });
    }

    try {
      const klass = await prisma.class.findFirst({
        where: { id: classId, course: { tenantId: req.tenantId! } },
      });
      if (!klass) return res.status(404).json({ error: 'Class not found in your institution.' });
      if (klass.teacherId !== req.user!.id) {
        return res.status(403).json({ error: 'Only the assigned teacher may create homework for this class.' });
      }
      const homework = await prisma.homework.create({
        data: {
          classId,
          subject,
          title,
          description,
          contentUrl,
          deadline: new Date(deadline),
          createdBy: req.user!.id,
        },
      });

      return res.status(201).json({ message: 'Homework created and distributed successfully.', homework });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to create homework.' });
    }
  }
);

// 2. Submit a solution to a homework assignment (Student only)
router.post(
  '/submit',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { homeworkId, studentId, submissionUrl, remarks } = req.body;

    if (!homeworkId || !studentId) {
      return res.status(400).json({
        error: 'Missing required parameters: homeworkId, studentId.',
      });
    }

    try {
      const [homework, student] = await Promise.all([
        prisma.homework.findFirst({
          where: { id: homeworkId, class: { course: { tenantId: req.tenantId! } } },
        }),
        prisma.student.findFirst({
          where: { id: studentId, userId: req.user!.id, user: { tenantId: req.tenantId! } },
        }),
      ]);
      if (!homework || !student) {
        return res.status(404).json({ error: 'Homework or student record not found.' });
      }
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId: student.id, classId: homework.classId, status: 'ACTIVE' },
      });
      if (!enrollment) return res.status(403).json({ error: 'Student is not actively enrolled in this class.' });
      let submission;
      try {
        submission = await prisma.homeworkSubmission.create({
          data: {
            homeworkId,
            studentId,
            submissionUrl,
            remarks,
          },
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          return res.status(409).json({ error: 'Homework was already submitted.' });
        }
        throw error;
      }

      return res.status(201).json({ message: 'Homework submitted successfully.', submission });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to submit homework.' });
    }
  }
);

// 3. Grade a submission (Teacher only)
router.post(
  '/grade/:submissionId',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { submissionId } = req.params;
    const { grade, remarks } = req.body;

    if (!grade) {
      return res.status(400).json({ error: 'Missing required parameter: grade.' });
    }

    try {
      const existing = await prisma.homeworkSubmission.findFirst({
        where: {
          id: submissionId,
          homework: {
            class: {
              teacherId: req.user!.id,
              course: { tenantId: req.tenantId! },
            },
          },
        },
      });
      if (!existing) return res.status(404).json({ error: 'Homework submission not found.' });
      const transition = await prisma.homeworkSubmission.updateMany({
        where: { id: existing.id, grade: null, gradedBy: null },
        data: {
          grade,
          remarks,
          gradedBy: req.user!.id,
        },
      });
      if (transition.count !== 1) {
        return res.status(409).json({ error: 'The submission was already graded by another request.' });
      }
      const submission = await prisma.homeworkSubmission.findUniqueOrThrow({ where: { id: existing.id } });

      return res.status(200).json({ message: 'Submission graded successfully.', submission });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to grade homework submission.' });
    }
  }
);

// 4. Get homework tasks for a class
router.get(
  '/:classId',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { classId } = req.params;

    try {
      const klass = await prisma.class.findFirst({
        where: { id: classId, course: { tenantId: req.tenantId! } },
        include: {
          enrollments: {
            where: { status: 'ACTIVE' },
            include: { student: { include: { studentParents: { include: { parent: true } } } } },
          },
        },
      });
      if (!klass) return res.status(404).json({ error: 'Class not found in your institution.' });
      const adminAccess = isTenantAdmin(req.user!) || canAccessBranch(req.user!, klass.branchId);
      const teacherAccess = klass.teacherId === req.user!.id;
      const ownStudentIds = klass.enrollments
        .filter((enrollment) => enrollment.student.userId === req.user!.id)
        .map((enrollment) => enrollment.studentId);
      const childStudentIds = klass.enrollments
        .filter((enrollment) =>
          enrollment.student.studentParents.some((link) => link.parent.userId === req.user!.id),
        )
        .map((enrollment) => enrollment.studentId);
      if (!adminAccess && !teacherAccess && ownStudentIds.length === 0 && childStudentIds.length === 0) {
        return res.status(403).json({ error: 'You cannot view homework for this class.' });
      }
      const visibleStudentIds = adminAccess || teacherAccess
        ? undefined
        : { in: [...new Set([...ownStudentIds, ...childStudentIds])] };
      const homeworkList = await prisma.homework.findMany({
        where: { classId: klass.id },
        include: { submissions: { where: { studentId: visibleStudentIds } } },
      });
      return res.status(200).json({ homework: homeworkList });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to load homework.' });
    }
  }
);

export default router;
