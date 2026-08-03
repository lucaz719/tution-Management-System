import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';
import { canAccessBranch, hasBranchPermission, isTenantAdmin } from '../utils/access-control';

const router = Router();

router.post('/student/scores', authMiddleware, hasPermission('manage_grades'), async (req: TenantRequest, res: Response) => {
  const { studentId, subject, assessment, score, maximum = 100, testDate } = req.body;
  const numericScore = Number(score);
  const numericMaximum = Number(maximum);
  if (!studentId || !subject?.trim() || !assessment?.trim() || !Number.isFinite(numericScore) || !Number.isFinite(numericMaximum)) {
    return res.status(400).json({ error: 'Student, subject, assessment, numeric score, and maximum are required.' });
  }
  if (numericMaximum <= 0 || numericScore < 0 || numericScore > numericMaximum) {
    return res.status(422).json({ error: 'Score must be between zero and the maximum.' });
  }
  try {
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        user: { tenantId: req.tenantId! },
        enrollments: { some: { class: { teacherId: req.user!.id }, status: { in: ['ACTIVE', 'BLOCKED'] } } },
      },
    });
    if (!student && !isTenantAdmin(req.user!)) return res.status(403).json({ error: 'You may only score students assigned to your classes.' });
    const result = await prisma.studentScore.create({
      data: {
        tenantId: req.tenantId!,
        studentId,
        recordedBy: req.user!.id,
        subject: subject.trim(),
        assessment: assessment.trim(),
        score: numericScore,
        maximum: numericMaximum,
        testDate: testDate ? new Date(testDate) : new Date(),
      },
    });
    return res.status(201).json({ message: 'Student score published.', score: result });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to publish score.', details: error.message });
  }
});

router.post('/student/remarks', authMiddleware, async (req: TenantRequest, res: Response) => {
  const { studentId, subject, message, signal = 'STABLE', parentVisible = false } = req.body;
  if (!studentId || !subject?.trim() || !message?.trim() || !['IMPROVING', 'STABLE', 'NEEDS_SUPPORT'].includes(signal)) {
    return res.status(400).json({ error: 'Student, subject, message, and a valid signal are required.' });
  }
  try {
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, class: { course: { tenantId: req.tenantId! } }, status: { in: ['ACTIVE', 'BLOCKED'] } },
      include: { class: { select: { branchId: true, teacherId: true } } },
    });
    const teachesStudent = enrollment?.class.teacherId === req.user!.id;
    const managesStudentBranch = Boolean(enrollment && hasBranchPermission(req.user!, 'manage_student_exceptions', enrollment.class.branchId));
    if (!teachesStudent && !managesStudentBranch && !isTenantAdmin(req.user!)) {
      return res.status(403).json({ error: 'You may only remark on students assigned to your class or branch.' });
    }
    const remark = await prisma.studentRemark.create({
      data: {
        tenantId: req.tenantId!,
        studentId,
        authorId: req.user!.id,
        subject: subject.trim(),
        message: message.trim(),
        signal,
        parentVisible: Boolean(parentVisible),
      },
    });
    return res.status(201).json({ message: 'Student remark saved.', remark });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to save student remark.', details: error.message });
  }
});

router.get('/student/:studentId', authMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const student = await prisma.student.findFirst({
      where: { id: req.params.studentId, user: { tenantId: req.tenantId! } },
      include: {
        studentParents: { include: { parent: true } },
        enrollments: { include: { class: true } },
        scores: { orderBy: { testDate: 'asc' } },
        remarks: { where: { parentVisible: true }, include: { author: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    const parentAccess = student.studentParents.some((link) => link.parent.userId === req.user!.id);
    const teacherAccess = student.enrollments.some((enrollment) => enrollment.class.teacherId === req.user!.id);
    const branchAccess = student.enrollments.some((enrollment) => canAccessBranch(req.user!, enrollment.class.branchId));
    if (student.userId !== req.user!.id && !parentAccess && !teacherAccess && !branchAccess && !isTenantAdmin(req.user!)) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    const bySubject = new Map<string, number[]>();
    student.scores.forEach((score) => {
      const list = bySubject.get(score.subject) ?? [];
      list.push((Number(score.score) / Number(score.maximum)) * 100);
      bySubject.set(score.subject, list);
    });
    const insights = [...bySubject.entries()].map(([subject, history]) => ({
      subject,
      history: history.map(Math.round),
      average: Math.round(history.reduce((sum, value) => sum + value, 0) / history.length),
      signal: history.length < 2 ? 'STABLE' : history.at(-1)! > history.at(-2)! ? 'IMPROVING' : history.at(-1)! < history.at(-2)! ? 'NEEDS_SUPPORT' : 'STABLE',
    }));
    return res.json({ scores: student.scores, insights, remarks: student.remarks });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to load student performance.' });
  }
});

router.get('/staff/scores', authMiddleware, hasPermission('view_reports'), async (_req: TenantRequest, res: Response) => {
  return res.status(501).json({ error: 'Staff performance scoring is outside the student performance workflow.' });
});

export default router;
