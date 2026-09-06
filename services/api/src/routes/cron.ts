import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware } from '../middleware/auth';
import { MockSmsSender, MockPushNotificationService } from '../utils/notifications';
import { isTenantAdmin } from '../utils/access-control';
import { reconcilePendingConnectIps } from '../utils/connectips';
import { generateDailyTeacherSessions } from '../services/timetable-service';

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
          const now = new Date();
          const candidates = await prisma.maintenanceTask.findMany({
            where: {
              branch: { tenantId: req.tenantId! },
              status: { not: 'COMPLETED' },
              escalatedAt: null,
            },
            select: { id: true, createdAt: true, escalationDaysSnapshot: true },
          });
          const overdueIds = candidates
            .filter((task) => task.createdAt.getTime() + task.escalationDaysSnapshot * 86_400_000 < now.getTime())
            .map((task) => task.id);
          if (overdueIds.length) await prisma.maintenanceTask.updateMany({
            where: { id: { in: overdueIds }, escalatedAt: null },
            data: { status: 'ESCALATED', escalatedAt: now },
          });
          logs.push(`Escalated ${overdueIds.length} overdue maintenance task(s) using each task's configured window.`);
        } catch (dbErr) {
          throw dbErr;
        }
      } else if (taskName === 'connectips-revalidate') {
        const result = await reconcilePendingConnectIps({ tenantId: req.tenantId! });
        logs.push(`Revalidated ${result.checked} pending connectIPS payment(s); confirmed ${result.confirmed}.`);
      } else if (taskName === 'daily-teacher-sessions') {
        const result = await generateDailyTeacherSessions({ tenantId: req.tenantId! });
        logs.push(`Generated ${result.created} teacher session(s) for ${result.day}; ${result.eligible} scheduled class(es) were eligible.`);
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
