import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware } from '../middleware/auth';

const router = Router();

const formatDate = (date: Date) => date.toLocaleDateString('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kathmandu',
});
const money = (value: number) => `NPR ${value.toLocaleString('en-NP')}`;
const attendanceLabel = (status: string) => status === 'EXCUSED' ? 'Absent (Excused)' : status === 'PRESENT' ? 'Present' : 'Absent';
const invoiceState = (status: string, dueDate: Date) => {
  if (status === 'PAID') return 'Paid';
  if (status === 'OVERDUE' || dueDate.getTime() < Date.now()) return 'Overdue';
  return dueDate.getTime() - Date.now() <= 3 * 86400000 ? 'Due soon' : 'Upcoming';
};
const eventKind = (type: string) => type === 'FEE_DUE' ? 'Fee due' : type === 'EVENT' ? 'Ceremony' : type.charAt(0) + type.slice(1).toLowerCase();
const appointmentState = (status: string) => ({
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ALTERNATIVE_PROPOSED: 'Alternative proposed',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Rejected',
}[status] ?? 'Requested');
const leaveState = (status: string, reason: string) => reason.startsWith('Emergency Out:')
  ? 'Emergency departure'
  : status === 'APPROVED_LEVEL2' ? 'Approved' : status === 'REJECTED' ? 'Rejected' : 'Pending';

router.get('/portal', authMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const parent = await prisma.parent.findFirst({
      where: { userId: req.user!.id, user: { tenantId: req.tenantId! } },
      include: {
        studentParents: {
          include: {
            student: {
              include: {
                user: true,
                grade: true,
                enrollments: {
                  where: { status: { in: ['ACTIVE', 'BLOCKED'] } },
                  include: {
                    course: true,
                    class: {
                      include: {
                        assignedTeacher: { select: { id: true, firstName: true, lastName: true } },
                        branch: true,
                      },
                    },
                  },
                },
                studentAttendance: {
                  include: { class: { include: { course: true } } },
                  orderBy: { date: 'desc' },
                  take: 60,
                },
                invoices: { orderBy: { dueDate: 'desc' }, take: 24 },
                certificates: { include: { template: true }, orderBy: { issuedDate: 'desc' } },
              },
            },
          },
        },
      },
    });
    if (!parent) return res.status(404).json({ error: 'No parent record is linked to this account.' });

    const children = parent.studentParents.map(({ student }) => {
      const counts = student.studentAttendance.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = (acc[row.status] ?? 0) + 1;
        return acc;
      }, {});
      const total = student.studentAttendance.length;
      const outstanding = student.invoices
        .filter((invoice) => ['UNPAID', 'OVERDUE'].includes(invoice.status))
        .reduce((sum, invoice) => sum + Number(invoice.netPayable), 0);
      const branch = student.enrollments[0]?.class.branch;
      return {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        initials: `${student.user.firstName[0] ?? ''}${student.user.lastName[0] ?? ''}`.toUpperCase(),
        grade: student.grade?.name ?? 'Grade not assigned',
        branch: branch?.name ?? 'Branch not assigned',
        branchId: branch?.id,
        rollNumber: student.id.slice(0, 6).toUpperCase(),
        blocked: student.enrollments.some((enrollment) => enrollment.status === 'BLOCKED') || student.invoices.some((invoice) => invoice.status === 'OVERDUE'),
        attendanceRate: total ? Math.round(((counts.PRESENT ?? 0) / total) * 100) : 0,
        outstanding,
      };
    });
    const requestedId = typeof req.query.studentId === 'string' ? req.query.studentId : children[0]?.id;
    const link = parent.studentParents.find(({ student }) => student.id === requestedId);
    if (!link) {
      if (!children.length) return res.json({ generatedAt: new Date().toISOString(), bookingWindowHours: 24, children: [], selected: null });
      return res.status(404).json({ error: 'Linked student not found.' });
    }
    const student = link.student;
    const child = children.find((item) => item.id === student.id)!;
    const classIds = student.enrollments.map((enrollment) => enrollment.classId);
    const branchIds = [...new Set(student.enrollments.map((enrollment) => enrollment.class.branchId))];
    const [events, leaves, appointments, messages, remarks, scores, tenant] = await Promise.all([
      prisma.academicEvent.findMany({
        where: { tenantId: req.tenantId!, OR: [{ branchId: null }, { branchId: { in: branchIds } }] },
        orderBy: { startDate: 'asc' },
        take: 100,
      }),
      prisma.leave.findMany({ where: { tenantId: req.tenantId!, userId: student.userId }, orderBy: { updatedAt: 'desc' }, take: 30 }),
      prisma.appointment.findMany({
        where: { tenantId: req.tenantId!, studentId: student.id, requestedById: req.user!.id },
        include: { teacher: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.parentMessage.findMany({
        where: { tenantId: req.tenantId!, studentId: student.id, OR: [{ senderId: req.user!.id }, { receiverId: req.user!.id }] },
        include: { sender: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.studentRemark.findMany({
        where: { tenantId: req.tenantId!, studentId: student.id, parentVisible: true },
        include: { author: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.studentScore.findMany({ where: { tenantId: req.tenantId!, studentId: student.id }, orderBy: { testDate: 'asc' } }),
      prisma.tenant.findUnique({ where: { id: req.tenantId! }, select: { appointmentWindowHours: true } }),
    ]);

    const weekday = new Intl.DateTimeFormat('en', { weekday: 'long', timeZone: 'Asia/Kathmandu' }).format(new Date()).toLowerCase();
    const sessions = student.enrollments.flatMap((enrollment) => {
      const schedule = Array.isArray(enrollment.class.schedule) ? enrollment.class.schedule as Array<Record<string, unknown>> : [];
      return schedule.filter((slot) => {
        const day = typeof slot.day === 'string' ? slot.day.toLowerCase() : '';
        return day === weekday || day === weekday.slice(0, 3);
      }).map((slot, index) => ({
        id: `${enrollment.classId}-${index}`,
        childId: student.id,
        time: typeof slot.start === 'string' ? slot.start : '—',
        endTime: typeof slot.end === 'string' ? slot.end : '—',
        subject: enrollment.course.name,
        teacher: enrollment.class.assignedTeacher ? `${enrollment.class.assignedTeacher.firstName} ${enrollment.class.assignedTeacher.lastName}` : 'Teacher not assigned',
        room: enrollment.class.name,
        type: enrollment.course.type.split('_').map((part) => part[0] + part.slice(1).toLowerCase()).join('-'),
      }));
    }).sort((a, b) => a.time.localeCompare(b.time));
    const teachers = [...new Map(student.enrollments
      .filter((enrollment) => enrollment.class.assignedTeacher)
      .map((enrollment) => {
        const teacher = enrollment.class.assignedTeacher!;
        return [teacher.id, {
          id: teacher.id,
          childId: student.id,
          name: `${teacher.firstName} ${teacher.lastName}`,
          subject: enrollment.course.name,
          initials: `${teacher.firstName[0] ?? ''}${teacher.lastName[0] ?? ''}`.toUpperCase(),
        }];
      })).values()];
    const attendance = student.studentAttendance.map((record) => ({
      id: record.id, childId: student.id, date: formatDate(record.date), subject: record.class.course.name,
      session: record.class.name, state: attendanceLabel(record.status),
    }));
    const invoices = student.invoices.map((invoice) => ({
      id: invoice.id, childId: student.id,
      cycle: invoice.billingCycleStart.toLocaleDateString('en', { month: 'long', year: 'numeric', timeZone: 'Asia/Kathmandu' }),
      dueDate: formatDate(invoice.dueDate), state: invoiceState(invoice.status, invoice.dueDate),
      reference: invoice.transactionId ?? invoice.id, netPayable: Number(invoice.netPayable), qrAvailable: invoice.status !== 'PAID',
      lines: [
        { label: `${invoice.invoiceType.charAt(0)}${invoice.invoiceType.slice(1).toLowerCase()} dues`, amount: Number(invoice.amount) },
        ...(Number(invoice.discount) ? [{ label: 'Discount', amount: -Number(invoice.discount) }] : []),
        ...(Number(invoice.fine) ? [{ label: 'Fine', amount: Number(invoice.fine) }] : []),
      ],
    }));
    const resultMap = new Map<string, number[]>();
    scores.forEach((score) => {
      const list = resultMap.get(score.subject) ?? [];
      list.push(Math.round(Number(score.score) / Number(score.maximum) * 100));
      resultMap.set(score.subject, list);
    });
    const scoreRemarks = [...resultMap.entries()].map(([subject, history]) => {
      const latest = history.at(-1)!;
      const previous = history.at(-2) ?? latest;
      return {
        id: `signal-${subject}`, childId: student.id, subject, author: 'Performance system',
        message: `Current average ${Math.round(history.reduce((sum, value) => sum + value, 0) / history.length)}% across ${history.length} assessment${history.length === 1 ? '' : 's'}.`,
        date: 'Calculated from published scores',
        signal: latest > previous ? 'Improving' : latest < previous ? 'Needs support' : 'Stable',
        parentVisible: true,
      };
    });
    const visibleRemarks = [
      ...remarks.map((remark) => ({
        id: remark.id, childId: student.id, subject: remark.subject,
        author: `${remark.author.firstName} ${remark.author.lastName}`, message: remark.message,
        date: formatDate(remark.createdAt),
        signal: remark.signal === 'IMPROVING' ? 'Improving' : remark.signal === 'NEEDS_SUPPORT' ? 'Needs support' : 'Stable',
        parentVisible: true,
      })),
      ...scoreRemarks,
    ];
    const mappedAppointments = appointments.map((appointment) => ({
      id: appointment.id, childId: student.id,
      teacher: `${appointment.teacher.firstName} ${appointment.teacher.lastName}`,
      subject: appointment.responseRemarks || appointment.remarks || 'Student meeting',
      requestedTime: formatDate(appointment.scheduledTime),
      alternativeTime: appointment.alternativeTime ? formatDate(appointment.alternativeTime) : undefined,
      responseDescription: appointment.responseRemarks || undefined,
      state: appointmentState(appointment.status), group: appointment.isGroup,
    }));
    const mappedLeaves = leaves.map((leave) => ({
      id: leave.id, childId: student.id,
      dates: leave.startDate.getTime() === leave.endDate.getTime() ? formatDate(leave.startDate) : `${formatDate(leave.startDate)} – ${formatDate(leave.endDate)}`,
      reason: leave.reason.replace(/^Emergency Out:\s*/, ''),
      state: leaveState(leave.status, leave.reason),
      detail: leave.status === 'APPROVED_LEVEL2' ? 'Approved leave is reflected as Absent (Excused).' : leave.remarks || 'Awaiting institution action.',
    }));
    const mappedEvents = events.map((event) => ({
      id: event.id, childId: student.id, day: event.startDate.toLocaleDateString('en', { day: '2-digit', timeZone: 'Asia/Kathmandu' }),
      month: event.startDate.toLocaleDateString('en', { month: 'short', timeZone: 'Asia/Kathmandu' }).toUpperCase(),
      date: formatDate(event.startDate), title: event.title, kind: eventKind(event.eventType), details: event.description ?? '',
    }));
    const certificates = student.certificates.map((certificate) => ({
      id: certificate.certificateId, childId: student.id, title: certificate.template.name,
      course: student.grade?.name ?? 'Student record', issuedDate: formatDate(certificate.issuedDate),
      fileName: `${certificate.certificateId}.pdf`, pdfUrl: `/certificates/${encodeURIComponent(certificate.certificateId)}/download`,
    }));
    const mappedMessages = messages.map((message) => ({
      id: message.id, childId: student.id,
      teacherId: message.senderId === req.user!.id ? message.receiverId : message.senderId,
      sender: message.senderId === req.user!.id ? 'Parent' : 'Teacher',
      text: message.messageText, time: formatDate(message.createdAt), occurredAt: message.createdAt.toISOString(),
    }));
    const notifications = [
      ...student.invoices.filter((invoice) => invoice.status === 'OVERDUE' || (invoice.status === 'UNPAID' && invoice.dueDate.getTime() - Date.now() <= 3 * 86400000)).map((invoice) => ({
        id: `invoice-${invoice.id}`, childId: student.id, title: invoice.status === 'OVERDUE' ? 'Fee overdue' : 'Fee due soon',
        message: `${money(Number(invoice.netPayable))} is due on ${formatDate(invoice.dueDate)}.`, time: formatDate(invoice.updatedAt),
        occurredAt: invoice.updatedAt.toISOString(), icon: 'payments', destination: 'fees', channels: ['Push', 'SMS'], urgent: invoice.status === 'OVERDUE', unread: true,
      })),
      ...student.studentAttendance.slice(0, 10).map((record) => ({
        id: `attendance-${record.id}`, childId: student.id, title: 'Attendance marked',
        message: `${record.class.course.name}: ${attendanceLabel(record.status)} on ${formatDate(record.date)}.`, time: formatDate(record.updatedAt),
        occurredAt: record.updatedAt.toISOString(), icon: 'fact_check', destination: 'attendance', channels: ['Push'], urgent: false, unread: record.updatedAt.getTime() >= Date.now() - 7 * 86400000,
      })),
      ...leaves.filter((leave) => leave.reason.startsWith('Emergency Out:')).map((leave) => ({
        id: `emergency-${leave.id}`, childId: student.id, title: 'Emergency departure',
        message: `${child.name} departed with branch approval. ${leave.reason.replace(/^Emergency Out:\s*/, '')}`, time: formatDate(leave.createdAt),
        occurredAt: leave.createdAt.toISOString(), icon: 'emergency', destination: 'leave', channels: ['Push', 'SMS'], urgent: true, unread: true,
      })),
      ...appointments.map((appointment) => ({
        id: `appointment-${appointment.id}`, childId: student.id, title: `Appointment ${appointmentState(appointment.status).toLowerCase()}`,
        message: `Appointment with ${appointment.teacher.firstName} ${appointment.teacher.lastName} on ${formatDate(appointment.scheduledTime)}.`,
        time: formatDate(appointment.updatedAt), occurredAt: appointment.updatedAt.toISOString(), icon: 'event',
        destination: 'appointments', channels: ['Push', 'SMS'], urgent: false, unread: appointment.updatedAt.getTime() >= Date.now() - 7 * 86400000,
      })),
      ...student.certificates.map((certificate) => ({
        id: `certificate-${certificate.id}`, childId: student.id, title: 'Certificate issued',
        message: `${certificate.template.name} is ready for ${child.name}.`, time: formatDate(certificate.issuedDate),
        occurredAt: certificate.issuedDate.toISOString(), icon: 'workspace_premium', destination: 'certificates',
        channels: ['Push'], urgent: false, unread: certificate.issuedDate.getTime() >= Date.now() - 7 * 86400000,
      })),
    ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

    return res.json({
      generatedAt: new Date().toISOString(),
      bookingWindowHours: tenant?.appointmentWindowHours ?? 24,
      children,
      selected: child,
      sessions,
      attendance,
      remarks: visibleRemarks,
      teachers,
      messages: mappedMessages,
      appointments: mappedAppointments,
      leaves: mappedLeaves,
      invoices,
      certificates,
      events: mappedEvents,
      notifications,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to load parent portal.', details: error.message });
  }
});

export default router;
