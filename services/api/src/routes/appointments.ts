import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware } from '../middleware/auth';
import { MockPushNotificationService, MockSmsSender } from '../utils/notifications';

const router = Router();

// 1. Request Appointment (Parent only)
router.post(
  '/request',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { studentId, teacherId, scheduledTime, remarks } = req.body;
    const parentId = req.user!.id;

    if (!studentId || !teacherId || !scheduledTime) {
      return res.status(400).json({ error: 'Missing required parameters: studentId, teacherId, scheduledTime.' });
    }

    // 1. Verify 24-hour advance booking window
    const scheduledDate = new Date(scheduledTime);
    const minBookingTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (scheduledDate < minBookingTime) {
      return res.status(422).json({
        error: 'Booking window constraint: Appointments must be scheduled at least 24 hours in advance.',
      });
    }

    // 2. Validate Privacy rule
    let isAuthorized = false;
    try {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          student: {
            id: studentId,
            studentParents: {
              some: {
                parent: { userId: parentId }
              }
            }
          },
          class: {
            sessions: {
              some: { teacherId }
            }
          }
        },
      });
      if (enrollment) isAuthorized = true;
    } catch {
      return res.status(500).json({ error: 'Unable to verify appointment authorization.' });
    }

    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Privacy Violation: You can only book appointments with teachers assigned to your child.',
      });
    }

    return res.status(501).json({ error: 'Persistent appointments are not implemented.' });
  }
);

// 2. Respond to Appointment (Teacher or Admin)
router.post(
  '/respond/:appointmentId',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { appointmentId } = req.params;
    const { action, alternativeSlot, remarks } = req.body;
    const responderId = req.user!.id;

    if (!action || !['APPROVE', 'REJECT', 'PROPOSE_ALTERNATIVE'].includes(action)) {
      return res.status(400).json({ error: 'Missing or invalid action parameter.' });
    }

    return res.status(501).json({ error: 'Persistent appointments are not implemented.' });
  }
);

// 3. Get Appointments
router.get(
  '/',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    return res.status(501).json({ error: 'Persistent appointments are not implemented.' });
  }
);

export default router;
