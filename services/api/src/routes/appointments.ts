import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware } from '../middleware/auth';
import { MockPushNotificationService, MockSmsSender } from '../utils/notifications';
import { canAccessBranch, isTenantAdmin } from '../utils/access-control';

const router = Router();

async function linkedStudent(parentUserId: string, tenantId: string, studentId: string) {
  return prisma.student.findFirst({
    where: {
      id: studentId,
      user: { tenantId },
      studentParents: { some: { parent: { userId: parentUserId } } },
    },
    include: { user: true, enrollments: { where: { status: { in: ['ACTIVE', 'BLOCKED'] } }, include: { class: true } } },
  });
}

router.post('/request', authMiddleware, async (req: TenantRequest, res: Response) => {
  const { studentId, teacherId, scheduledTime, remarks, isGroup = false, participantIds = [] } = req.body;
  if (!studentId || !teacherId || !scheduledTime) {
    return res.status(400).json({ error: 'Missing required parameters: studentId, teacherId, scheduledTime.' });
  }
  try {
    const [student, tenant] = await Promise.all([
      linkedStudent(req.user!.id, req.tenantId!, studentId),
      prisma.tenant.findUnique({ where: { id: req.tenantId! }, select: { appointmentWindowHours: true } }),
    ]);
    if (!student || !tenant) return res.status(404).json({ error: 'Linked student was not found.' });
    const scheduledDate = new Date(scheduledTime);
    if (Number.isNaN(scheduledDate.getTime())) return res.status(422).json({ error: 'Choose a valid appointment date and time.' });
    const minimum = Date.now() + tenant.appointmentWindowHours * 60 * 60 * 1000;
    if (scheduledDate.getTime() < minimum) {
      return res.status(422).json({ error: `Appointments must be scheduled at least ${tenant.appointmentWindowHours} hours in advance.` });
    }

    const assignedTeacherIds = new Set(student.enrollments.map((enrollment) => enrollment.class.teacherId).filter(Boolean));
    if (!assignedTeacherIds.has(teacherId)) {
      return res.status(403).json({ error: 'You can only book with teachers assigned to this child.' });
    }
    const uniqueParticipants = [...new Set([teacherId, ...(Array.isArray(participantIds) ? participantIds : [])])];
    if (isGroup && uniqueParticipants.some((id) => !assignedTeacherIds.has(id))) {
      return res.status(403).json({ error: 'Every group participant must be assigned to this child.' });
    }
    const approvals = Object.fromEntries(uniqueParticipants.map((id) => [id, 'PENDING']));
    const appointment = await prisma.appointment.create({
      data: {
        tenantId: req.tenantId!,
        studentId,
        requestedById: req.user!.id,
        teacherId,
        scheduledTime: scheduledDate,
        remarks: remarks?.trim() || null,
        isGroup: Boolean(isGroup),
        participantIds: uniqueParticipants,
        participantApprovals: approvals,
      },
      include: { teacher: { select: { firstName: true, lastName: true } } },
    });
    await MockPushNotificationService.sendPush(teacherId, 'Appointment requested', `A parent requested an appointment about ${student.user.firstName}.`);
    return res.status(201).json({ message: 'Appointment requested.', appointment, bookingWindowHours: tenant.appointmentWindowHours });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to request appointment.', details: error.message });
  }
});

router.post('/respond/:appointmentId', authMiddleware, async (req: TenantRequest, res: Response) => {
  const { action, alternativeSlot, remarks } = req.body;
  if (!['APPROVE', 'REJECT', 'PROPOSE_ALTERNATIVE'].includes(action)) {
    return res.status(400).json({ error: 'Action must be APPROVE, REJECT, or PROPOSE_ALTERNATIVE.' });
  }
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.appointmentId, tenantId: req.tenantId! },
      include: { student: { include: { user: true } } },
    });
    if (!appointment) return res.status(404).json({ error: 'Appointment not found.' });
    const participantIds = Array.isArray(appointment.participantIds) ? appointment.participantIds as string[] : [appointment.teacherId];
    const staffAccess = isTenantAdmin(req.user!) || req.user!.roles.some((role: any) => role.branchId && canAccessBranch(req.user!, role.branchId));
    if (!participantIds.includes(req.user!.id) && !staffAccess) {
      return res.status(403).json({ error: 'You are not an invited appointment participant.' });
    }

    if (action === 'PROPOSE_ALTERNATIVE') {
      const proposed = new Date(alternativeSlot);
      if (!alternativeSlot || Number.isNaN(proposed.getTime()) || proposed.getTime() <= Date.now()) {
        return res.status(422).json({ error: 'A valid future alternative time is required.' });
      }
      const linked = await prisma.$transaction(async (tx) => {
        await tx.appointment.update({ where: { id: appointment.id }, data: { status: 'ALTERNATIVE_PROPOSED', alternativeTime: proposed, responseRemarks: remarks?.trim() || null } });
        return tx.appointment.create({
          data: {
            tenantId: appointment.tenantId,
            studentId: appointment.studentId,
            requestedById: appointment.requestedById,
            teacherId: appointment.teacherId,
            scheduledTime: proposed,
            status: 'REQUESTED',
            isGroup: appointment.isGroup,
            participantIds: appointment.participantIds ?? undefined,
            participantApprovals: appointment.participantApprovals ?? undefined,
            remarks: appointment.remarks,
            responseRemarks: remarks?.trim() || null,
            originalAppointmentId: appointment.id,
          },
        });
      });
      await MockPushNotificationService.sendPush(appointment.requestedById, 'Alternative appointment proposed', `A new time was proposed for ${appointment.student.user.firstName}.`);
      return res.json({ message: 'Alternative time proposed as a linked request.', appointment: linked });
    }

    if (action === 'REJECT') {
      const updated = await prisma.appointment.update({ where: { id: appointment.id }, data: { status: 'REJECTED', responseRemarks: remarks?.trim() || null } });
      await MockPushNotificationService.sendPush(appointment.requestedById, 'Appointment rejected', `The appointment about ${appointment.student.user.firstName} was rejected.`);
      return res.json({ message: 'Appointment rejected.', appointment: updated });
    }

    const approvals = { ...((appointment.participantApprovals as Record<string, string> | null) ?? {}) };
    approvals[req.user!.id] = 'APPROVED';
    const allApproved = participantIds.every((id) => approvals[id] === 'APPROVED');
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { participantApprovals: approvals, status: allApproved ? 'CONFIRMED' : 'APPROVED', responseRemarks: remarks?.trim() || null },
    });
    await MockPushNotificationService.sendPush(appointment.requestedById, allApproved ? 'Appointment confirmed' : 'Appointment participant approved', `Appointment update for ${appointment.student.user.firstName}.`);
    return res.json({ message: allApproved ? 'Appointment confirmed.' : 'Participant approval recorded.', appointment: updated });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to respond to appointment.', details: error.message });
  }
});

router.get('/', authMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const parent = await prisma.parent.findFirst({ where: { userId: req.user!.id }, select: { id: true } });
    const where = parent
      ? { tenantId: req.tenantId!, student: { studentParents: { some: { parentId: parent.id } } } }
      : { tenantId: req.tenantId!, teacherId: req.user!.id };
    const appointments = await prisma.appointment.findMany({
      where,
      include: { teacher: { select: { firstName: true, lastName: true } }, student: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ appointments });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to load appointments.' });
  }
});

export default router;
