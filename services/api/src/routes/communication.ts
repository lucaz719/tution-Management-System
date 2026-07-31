import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware } from '../middleware/auth';
import { MockPushNotificationService } from '../utils/notifications';
import { isTenantAdmin } from '../utils/access-control';

const router = Router();

async function canUseThread(userId: string, tenantId: string, studentId: string, otherUserId?: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, user: { tenantId } },
    include: {
      studentParents: { include: { parent: true } },
      enrollments: { where: { status: { in: ['ACTIVE', 'BLOCKED'] } }, include: { class: true } },
    },
  });
  if (!student) return null;
  const parentUserIds = student.studentParents.map((link) => link.parent.userId);
  const teacherIds = student.enrollments.map((enrollment) => enrollment.class.teacherId).filter((id): id is string => Boolean(id));
  const userIsParent = parentUserIds.includes(userId);
  const userIsTeacher = teacherIds.includes(userId);
  if (!userIsParent && !userIsTeacher) return null;
  if (otherUserId && userIsParent && !teacherIds.includes(otherUserId)) return null;
  if (otherUserId && userIsTeacher && !parentUserIds.includes(otherUserId)) return null;
  return { student, parentUserIds, teacherIds, userIsParent };
}

router.post('/messages', authMiddleware, async (req: TenantRequest, res: Response) => {
  const { studentId, receiverId, messageText } = req.body;
  const text = typeof messageText === 'string' ? messageText.trim() : '';
  if (!studentId || !receiverId || !text) {
    return res.status(400).json({ error: 'Student, recipient, and message are required.' });
  }
  if (text.length > 4000) return res.status(422).json({ error: 'Message must be 4,000 characters or fewer.' });
  try {
    const access = await canUseThread(req.user!.id, req.tenantId!, studentId, receiverId);
    if (!access) return res.status(403).json({ error: 'You may only message an assigned teacher or linked parent for this student.' });
    const message = await prisma.parentMessage.create({
      data: { tenantId: req.tenantId!, studentId, senderId: req.user!.id, receiverId, messageText: text },
    });
    await MockPushNotificationService.sendPush(receiverId, 'New parent-teacher message', `New message regarding ${access.student.id}.`);
    return res.status(201).json({ message: 'Message sent.', record: message });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to send message.', details: error.message });
  }
});

router.get('/messages/thread/:studentId', authMiddleware, async (req: TenantRequest, res: Response) => {
  const teacherId = typeof req.query.teacherId === 'string' ? req.query.teacherId : undefined;
  try {
    const access = await canUseThread(req.user!.id, req.tenantId!, req.params.studentId, teacherId);
    if (!access) return res.status(404).json({ error: 'Conversation not found.' });
    const participantIds = teacherId ? [req.user!.id, teacherId] : [req.user!.id];
    const messages = await prisma.parentMessage.findMany({
      where: {
        tenantId: req.tenantId!,
        studentId: req.params.studentId,
        ...(teacherId ? {
          OR: [
            { senderId: participantIds[0], receiverId: participantIds[1] },
            { senderId: participantIds[1], receiverId: participantIds[0] },
          ],
        } : { OR: [{ senderId: req.user!.id }, { receiverId: req.user!.id }] }),
      },
      include: { sender: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'asc' },
    });
    await prisma.parentMessage.updateMany({
      where: { id: { in: messages.filter((message) => message.receiverId === req.user!.id && !message.readAt).map((message) => message.id) } },
      data: { readAt: new Date() },
    });
    return res.json({ messages });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to load conversation.' });
  }
});

router.post('/broadcast', authMiddleware, async (req: TenantRequest, res: Response) => {
  if (!isTenantAdmin(req.user!)) return res.status(403).json({ error: 'Only the Tenant Admin may broadcast.' });
  return res.status(501).json({ error: 'Institutional broadcasts are outside the parent-teacher thread workflow.' });
});

export default router;
