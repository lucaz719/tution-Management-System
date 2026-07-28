import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware } from '../middleware/auth';
import { MockPushNotificationService, MockSmsSender } from '../utils/notifications';

const router = Router();

// 1. Send message with Parent-Teacher privacy validations
router.post(
  '/messages',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { studentId, receiverId, messageText } = req.body;
    const senderId = req.user!.id;
    const senderRole = req.user!.roles[0]?.roleName;

    if (!studentId || !receiverId || !messageText) {
      return res.status(400).json({ error: 'Missing required parameters: studentId, receiverId, messageText.' });
    }

    let isAuthorized = false;

    try {
      if (senderRole === 'Parent') {
        const enrollment = await prisma.enrollment.findFirst({
          where: {
            student: {
              id: studentId,
              studentParents: {
                some: {
                  parent: { userId: senderId }
                }
              }
            },
            class: {
              sessions: {
                some: { teacherId: receiverId }
              }
            }
          },
        });
        if (enrollment) isAuthorized = true;
      } else if (senderRole === 'Teacher') {
        const student = await prisma.student.findFirst({
          where: {
            id: studentId,
            studentParents: {
              some: {
                parent: { userId: receiverId }
              }
            },
            enrollments: {
              some: {
                class: {
                  sessions: {
                    some: { teacherId: senderId }
                  }
                }
              }
            }
          },
        });
        if (student) isAuthorized = true;
      } else if (senderRole === 'Tenant Admin' || senderRole === 'Branch Admin') {
        isAuthorized = true;
      }
    } catch {
      return res.status(500).json({ error: 'Unable to verify messaging authorization.' });
    }

    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Privacy Violation: You are not authorized to message this recipient.',
      });
    }

    return res.status(501).json({ error: 'Persistent messaging is not implemented.' });
  }
);

// 2. Get message thread for a student
router.get(
  '/messages/thread/:studentId',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { studentId } = req.params;
    return res.status(501).json({ error: 'Persistent messaging is not implemented.' });
  }
);

// 3. One-Way Institutional Broadcast (Admins only)
router.post(
  '/broadcast',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { messageText, target, targetId } = req.body;
    const senderRole = req.user!.roles[0]?.roleName;

    if (senderRole !== 'Tenant Admin' && senderRole !== 'Branch Admin') {
      return res.status(403).json({ error: 'Only admins can dispatch broadcasts.' });
    }

    if (!messageText || !target) {
      return res.status(400).json({ error: 'Missing required parameters: messageText, target.' });
    }

    return res.status(501).json({ error: 'Persistent institutional broadcasts are not implemented.' });
  }
);

export default router;
