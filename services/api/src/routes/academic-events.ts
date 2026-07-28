import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';
import { EventType } from '@tms/types';
import { canAccessBranch, isTenantAdmin } from '../utils/access-control';

const router = Router();

// 1. Create a new Academic Event (Tenant Admin / Branch Admin)
router.post(
  '/',
  authMiddleware,
  hasPermission('manage_branch_calendar'),
  async (req: TenantRequest, res: Response) => {
    const { title, description, eventType, startDate, endDate, branchId } = req.body;

    if (!title || !eventType || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required parameters: title, eventType, startDate, endDate.',
      });
    }
    if (!isTenantAdmin(req.user!) && (!branchId || !canAccessBranch(req.user!, branchId))) {
      return res.status(403).json({ error: 'Branch Admins may only create events for their assigned branch.' });
    }

    try {
      const event = await prisma.academicEvent.create({
        data: {
          tenantId: req.tenantId!,
          branchId: branchId || null,
          title,
          description,
          eventType: eventType as EventType,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      });

      return res.status(201).json({ message: 'Academic event created successfully.', event });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to create academic event.' });
    }
  }
);

// 2. Retrieve all calendar events (filtered by tenant and branch)
router.get(
  '/',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const branchId = req.query.branchId as string | undefined;

    try {
      const events = await prisma.academicEvent.findMany({
        where: {
          tenantId: req.tenantId!,
          OR: [
            { branchId: null },
            { branchId: branchId || undefined },
          ],
        },
      });
      return res.status(200).json({ events });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to load academic events.' });
    }
  }
);

// 3. Payment Calendar: Retrieve fee deadlines, color-coded and complete with invoice + Nepal Pay QR
router.get(
  '/payments',
  authMiddleware,
  hasPermission('view_billing'),
  async (req: TenantRequest, res: Response) => {
    const studentId = req.query.studentId as string;

    try {
      // Find invoices for student or tenant
      const invoices = await prisma.invoice.findMany({
        where: {
          tenantId: req.tenantId!,
          studentId: studentId || undefined,
        },
      });

      const paymentEvents = invoices.map(invoice => {
        const dueDate = new Date(invoice.dueDate);
        const today = new Date();
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let urgencyColor = 'green'; // Upcoming
        if (invoice.status === 'PAID') {
          urgencyColor = 'green';
        } else if (diffDays < 0) {
          urgencyColor = 'red'; // Overdue
        } else if (diffDays <= 3) {
          urgencyColor = 'amber'; // Due soon
        }

        return {
          invoiceId: invoice.id,
          studentId: invoice.studentId,
          dueDate: invoice.dueDate,
          amount: invoice.netPayable,
          status: invoice.status,
          urgencyColor,
          nepalPayQrCode: invoice.nepalPayQrCode,
        };
      });

      return res.status(200).json({ paymentEvents });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to load payment calendar.' });
    }
  }
);

export default router;
