import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';

const router = Router();

// 1. Create a new Homework assignment (Teacher only)
router.post(
  '/',
  authMiddleware,
  hasPermission('manage_homework'),
  async (req: TenantRequest, res: Response) => {
    const { classId, subject, title, description, contentUrl, deadline } = req.body;

    if (!classId || !subject || !title || !deadline) {
      return res.status(400).json({
        error: 'Missing required parameters: classId, subject, title, deadline.',
      });
    }

    try {
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
  hasPermission('submit_homework'),
  async (req: TenantRequest, res: Response) => {
    const { homeworkId, studentId, submissionUrl, remarks } = req.body;

    if (!homeworkId || !studentId) {
      return res.status(400).json({
        error: 'Missing required parameters: homeworkId, studentId.',
      });
    }

    try {
      const submission = await prisma.homeworkSubmission.create({
        data: {
          homeworkId,
          studentId,
          submissionUrl,
          remarks,
        },
      });

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
  hasPermission('manage_homework'),
  async (req: TenantRequest, res: Response) => {
    const { submissionId } = req.params;
    const { grade, remarks } = req.body;

    if (!grade) {
      return res.status(400).json({ error: 'Missing required parameter: grade.' });
    }

    try {
      const submission = await prisma.homeworkSubmission.update({
        where: { id: submissionId },
        data: {
          grade,
          remarks,
          gradedBy: req.user!.id,
        },
      });

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
      const homeworkList = await prisma.homework.findMany({
        where: { classId },
        include: { submissions: true },
      });
      return res.status(200).json({ homework: homeworkList });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to load homework.' });
    }
  }
);

export default router;
