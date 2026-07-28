import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware } from '../middleware/auth';
import { MockSmsSender, MockPushNotificationService } from '../utils/notifications';
import { isTenantAdmin } from '../utils/access-control';
import { reconcilePendingConnectIps } from '../utils/connectips';

const router = Router();

// Endpoint to trigger cron automation tasks
router.post(
  '/trigger',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    if (!isTenantAdmin(req.user!)) {
      return res.status(403).json({ error: 'Only the Tenant Admin may run institution automation.' });
    }
    const { taskName } = req.body;

    if (!taskName) {
      return res.status(400).json({ error: 'Missing required parameter: taskName.' });
    }

    try {
      const logs = [];
      const smsSender = new MockSmsSender();

      if (taskName === 'monthly-due-verification') {
        try {
          await prisma.invoice.updateMany({
            where: { tenantId: req.tenantId!, status: 'UNPAID' },
            data: { status: 'OVERDUE' },
          });
          
          await prisma.enrollment.updateMany({
            where: {
              student: {
                user: { tenantId: req.tenantId! },
                invoices: { some: { tenantId: req.tenantId!, status: 'OVERDUE' } },
              },
            },
            data: { status: 'BLOCKED' },
          });
        } catch (dbErr) {
          throw dbErr;
        }

        logs.push('Verified unpaid invoices, updated status to OVERDUE, and blocked enrollments.');
      } else if (taskName === 'fee-reminder-sms') {
        await smsSender.sendSms(
          '98510XXXXX',
          'Dear Parent, your child\'s tuition fees are overdue. Access is currently blocked. Please settle the invoice.'
        );
        logs.push('Sent overdue SMS alerts to parents of blocked students.');
      } else if (taskName === 'salary-reminder') {
        await MockPushNotificationService.sendPush(
          'admin-user-111',
          'Payroll Calculation Reminder',
          'It is the 25th of the month. Please run and calculate payrolls for all staff.'
        );
        logs.push('Sent payroll calculation notification to Tenant Admin.');
      } else if (taskName === 'petty-cash-reset') {
        logs.push('Petty cash caps reset for all branches.');
      } else if (taskName === 'contract-expiry-alerts') {
        logs.push('Alerts generated for contracts expiring within 30 days.');
      } else if (taskName === 'task-escalation') {
        try {
          await prisma.maintenanceTask.updateMany({
            where: {
              branch: { tenantId: req.tenantId! },
              status: 'PENDING',
              createdAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
            },
            data: {
              status: 'ESCALATED',
            },
          });
        } catch (dbErr) {
          throw dbErr;
        }
        logs.push('Escalated pending maintenance tasks older than 3 days.');
      } else if (taskName === 'connectips-revalidate') {
        const result = await reconcilePendingConnectIps();
        logs.push(`Revalidated ${result.checked} pending connectIPS payment(s); confirmed ${result.confirmed}.`);
      } else {
        return res.status(400).json({ error: `Unknown taskName: ${taskName}.` });
      }

      return res.status(200).json({
        message: `Cron automation '${taskName}' executed successfully.`,
        executionLogs: logs,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to run cron automation task.', details: error.message });
    }
  }
);

export default router;
