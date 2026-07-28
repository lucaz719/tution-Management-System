import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware } from '../middleware/auth';
import { MockPushNotificationService } from '../utils/notifications';
import { canAccessBranch, hasBranchPermission } from '../utils/access-control';

const router = Router();

// 1. Submit Resource Log
router.post(
  '/log',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { classroomId, itemsCondition, actionRequired, remarks, branchId } = req.body;
    const staffId = req.user!.id;

    if (!classroomId || !itemsCondition || actionRequired === undefined || !branchId) {
      return res.status(400).json({
        error: 'Missing required parameters: classroomId, itemsCondition, actionRequired, branchId.',
      });
    }
    if (!hasBranchPermission(req.user!, 'manage_resource_tasks', branchId)) {
      return res.status(403).json({ error: 'You cannot manage resources for this branch.' });
    }

    try {
      const branch = await prisma.branch.findFirst({ where: { id: branchId, tenantId: req.tenantId! } });
      if (!branch) return res.status(404).json({ error: 'Branch not found in your institution.' });
      const defaultAssignee = await prisma.userRole.findFirst({
        where: { branchId, user: { tenantId: req.tenantId! }, role: { name: 'Janitor' } },
        select: { userId: true },
      });
      if (!defaultAssignee) {
        return res.status(422).json({ error: 'No Janitor is assigned to this branch. Assign one before logging maintenance work.' });
      }
      const assignedStaffId = defaultAssignee.userId;
      const tenantPolicy = await prisma.tenant.findUniqueOrThrow({ where: { id: req.tenantId! } });
      const resourceLog = await prisma.resourceLog.create({
          data: {
            branchId,
            classroomId,
            staffId,
            itemsCondition,
            actionRequired,
            remarks,
          },
        });

      let maintenanceTask: any = null;
      if (actionRequired) {
        maintenanceTask = await prisma.maintenanceTask.create({
            data: {
              branchId,
              description: `Issues logged by staff: ${remarks || 'None specified'}. Condition: ${JSON.stringify(itemsCondition)}`,
              assignedStaffId,
              status: 'PENDING',
              escalationDaysSnapshot: tenantPolicy.maintenanceEscalationDays,
            },
          });

        await MockPushNotificationService.sendPush(
          assignedStaffId,
          'New Maintenance Task Auto-Assigned',
          `Room ${classroomId} requires check. Reason: ${remarks}`
        );
      }

      return res.status(201).json({
        message: 'Resource log successfully registered.',
        resourceLog,
        maintenanceTask,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to log resource condition.', details: error.message });
    }
  }
);

// 2. Get Maintenance Tasks
router.get(
  '/tasks',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const branchId = req.query.branchId as string | undefined;
    if (!branchId) return res.status(400).json({ error: 'branchId is required.' });
    if (!canAccessBranch(req.user!, branchId) && !hasBranchPermission(req.user!, 'view_tasks', branchId)) {
      return res.status(403).json({ error: 'You cannot view tasks for this branch.' });
    }
    try {
      const branch = await prisma.branch.findFirst({ where: { id: branchId, tenantId: req.tenantId! } });
      if (!branch) return res.status(404).json({ error: 'Branch not found in your institution.' });
      const tasks = await prisma.maintenanceTask.findMany({
          where: { branchId },
        });
      return res.status(200).json({ tasks });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to retrieve tasks.' });
    }
  }
);

// 3. Complete Maintenance Task
router.post(
  '/tasks/complete/:taskId',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { taskId } = req.params;

    try {
      const task = await prisma.maintenanceTask.findFirst({
        where: { id: taskId, branch: { tenantId: req.tenantId! } },
      });
      if (!task) return res.status(404).json({ error: 'Maintenance task not found.' });
      const ownsTask = task.assignedStaffId === req.user!.id;
      if (!ownsTask && !hasBranchPermission(req.user!, 'manage_resource_tasks', task.branchId)) {
        return res.status(403).json({ error: 'You cannot complete this maintenance task.' });
      }
      if (task.status === 'COMPLETED') {
        return res.status(409).json({ error: 'Maintenance task is already completed.' });
      }
      const transition = await prisma.maintenanceTask.updateMany({
          where: { id: taskId, status: { not: 'COMPLETED' }, branch: { tenantId: req.tenantId! } },
          data: {
            status: 'COMPLETED',
            completionTimestamp: new Date(),
          },
        });
      if (transition.count !== 1) {
        return res.status(409).json({ error: 'Maintenance task was completed by another request.' });
      }

      return res.status(200).json({
        message: 'Maintenance task successfully resolved.',
        task: {
          id: taskId,
          status: 'COMPLETED',
          completionTimestamp: new Date(),
        },
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to complete task.', details: error.message });
    }
  }
);

export default router;
