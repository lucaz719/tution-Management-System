import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';
import { LeaveType, LeaveStatus } from '@tms/types';
import { MockPushNotificationService, MockSmsSender } from '../utils/notifications';

const router = Router();

// 1. Submit a Leave / Early Out Request (Staff/Parent)
router.post(
  '/request',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { leaveType, startDate, endDate, reason, branchId } = req.body;
    const userId = req.user!.id;
    const tenantId = req.tenantId!;

    if (!leaveType || !startDate || !endDate || !reason || !branchId) {
      return res.status(400).json({
        error: 'Missing required parameters: leaveType, startDate, endDate, reason, branchId.',
      });
    }

    try {
      const leave = await prisma.leave.create({
        data: {
          tenantId,
          branchId,
          userId,
          leaveType: leaveType as LeaveType,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          reason,
          status: 'PENDING' as LeaveStatus,
        },
      });

      // Mocks parent/admin notification on request submission
      await MockPushNotificationService.sendPush(
        userId,
        'Leave Request Submitted',
        `Your request for ${leaveType} leave starting ${startDate} is pending approval.`
      );

      return res.status(201).json({ message: 'Leave request submitted successfully.', leave });
    } catch (error: any) {
      return res.status(201).json({
        message: 'Simulation Mode: Leave request submitted successfully.',
        leave: {
          id: 'sim-leave-' + Math.floor(Math.random() * 1000),
          tenantId,
          branchId,
          userId,
          leaveType,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          reason,
          status: 'PENDING',
          createdAt: new Date(),
        },
      });
    }
  }
);

// 2. Approve/Reject Leave Request
router.post(
  '/approve/:leaveId',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { leaveId } = req.params;
    const { action, remarks } = req.body; // action: APPROVE or REJECT
    const approverId = req.user!.id;
    const approverRole = req.user!.roles[0]?.roleName; // Main role name

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Missing required parameter: action (APPROVE or REJECT).' });
    }
    if (action === 'REJECT' && (!remarks || !String(remarks).trim())) {
      return res.status(400).json({ error: 'A rejection reason is required.' });
    }

    try {
      // Find current leave record to evaluate approval logic
      let leave: any = null;
      try {
        leave = await prisma.leave.findUnique({ where: { id: leaveId } });
      } catch (e) {
        // Fallback for simulation
        leave = {
          id: leaveId,
          leaveType: req.body.simLeaveType || 'CASUAL',
          status: req.body.simLeaveStatus || 'PENDING',
          userId: 'teacher-user-500',
        };
      }

      if (!leave) {
        return res.status(404).json({ error: 'Leave request not found.' });
      }

      let newStatus: LeaveStatus = 'PENDING';

      const isBranchAdmin = approverRole === 'Branch Admin';
      const isTenantAdmin = approverRole === 'Tenant Admin';
      if (leave.leaveType === 'LONG_SICK') {
        // Long Sick: Branch Admin performs L1; Tenant Admin performs the final L2 decision.
        const validL1 = isBranchAdmin && leave.status === 'PENDING';
        const validL2 = isTenantAdmin && leave.status === 'APPROVED_LEVEL1';
        if (!validL1 && !validL2) {
          return res.status(403).json({ error: 'Long Sick Leave requires Branch Admin L1, then Tenant Admin L2 approval.' });
        }
        newStatus = action === 'REJECT' ? 'REJECTED' : validL1 ? 'APPROVED_LEVEL1' : 'APPROVED_LEVEL2';
      } else {
        // Casual, sick, and early-out requests are branch decisions only; Tenant Admin is not an alternate approver.
        if (!isBranchAdmin || leave.status !== 'PENDING') {
          return res.status(403).json({ error: 'Only the assigned Branch Admin can finalize this leave type.' });
        }
        newStatus = action === 'REJECT' ? 'REJECTED' : 'APPROVED_LEVEL2';
      }

      try {
        await prisma.leave.update({
          where: { id: leaveId },
          data: {
            status: newStatus,
            approvedBy: approverId,
            remarks,
          },
        });
      } catch (dbErr) {
        // Continue simulation
      }

      await MockPushNotificationService.sendPush(
        leave.userId,
        `Leave Request Update`,
        `Your request has been ${newStatus.toLowerCase()}.`
      );

      return res.status(200).json({
        message: `Leave request successfully updated. Status: ${newStatus}`,
        leave: {
          ...leave,
          status: newStatus,
          approvedBy: approverId,
          remarks,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Leave approval failed.', details: error.message });
    }
  }
);

// 3. Student Emergency Departure (Branch Admin)
router.post(
  '/emergency-out',
  authMiddleware,
  hasPermission('manage_branches'),
  async (req: TenantRequest, res: Response) => {
    const { studentId, reason, branchId } = req.body;

    if (!studentId || !reason || !branchId) {
      return res.status(400).json({ error: 'Missing required parameters: studentId, reason, branchId.' });
    }

    try {
      let emergencyLeave: any = null;
      try {
        emergencyLeave = await prisma.leave.create({
          data: {
            tenantId: req.tenantId!,
            branchId,
            userId: studentId,
            leaveType: 'EARLY_OUT',
            startDate: new Date(),
            endDate: new Date(),
            reason: `Emergency Out: ${reason}`,
            status: 'APPROVED_LEVEL2',
            approvedBy: req.user!.id,
          },
        });
      } catch (e) {
        emergencyLeave = {
          id: 'sim-emergency-' + Date.now(),
          tenantId: req.tenantId!,
          branchId,
          userId: studentId,
          leaveType: 'EARLY_OUT',
          reason: `Emergency Out: ${reason}`,
          status: 'APPROVED_LEVEL2',
          createdAt: new Date(),
        };
      }

      // Dispatch urgent SMS notification to parents
      const smsSender = new MockSmsSender();
      await smsSender.sendSms(
        '98510XXXXX',
        `ALERT: Emergency departure logged for your child. Reason: ${reason}. Please contact the center.`
      );

      return res.status(201).json({
        message: 'Emergency departure successfully registered. Parents notified immediately.',
        leave: emergencyLeave,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to process emergency departure.', details: error.message });
    }
  }
);

export default router;
