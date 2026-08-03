import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware } from '../middleware/auth';
import { hasBranchPermission } from '../utils/access-control';

const router = Router();
router.use(authMiddleware);

function branchAllowed(req: TenantRequest, branchId: string, permission: string) {
  return Boolean(branchId && hasBranchPermission(req.user!, permission, branchId));
}

router.post('/fee-overrides', async (req: TenantRequest, res: Response) => {
  const { branchId, studentId, scope } = req.body;
  const reason = String(req.body.reason || '').trim();
  if (!branchAllowed(req, branchId, 'manage_student_exceptions')) return res.status(403).json({ error: 'You cannot grant overrides for this branch.' });
  if (!studentId || !reason || !['ONE_SESSION', 'ONE_DAY'].includes(scope)) return res.status(400).json({ error: 'Student, reason, and a one-session or one-day scope are required.' });
  const student = await prisma.student.findFirst({ where: { id: studentId, user: { tenantId: req.tenantId! }, enrollments: { some: { class: { branchId }, status: 'BLOCKED' } } } });
  if (!student) return res.status(404).json({ error: 'A fee-blocked student was not found in this branch.' });
  const expiresAt = new Date(Date.now() + (scope === 'ONE_DAY' ? 24 : 3) * 60 * 60 * 1000);
  const override = await prisma.feeAccessOverride.create({ data: { tenantId: req.tenantId!, branchId, studentId, scope, reason, grantedById: req.user!.id, grantedByName: `${req.user!.firstName} ${req.user!.lastName}`.trim(), expiresAt } });
  return res.status(201).json({ message: 'Temporary fee access granted.', override });
});

router.get('/students/:studentId/fee-history', async (req: TenantRequest, res: Response) => {
  const branchId = String(req.query.branchId || '');
  if (!branchAllowed(req, branchId, 'manage_student_exceptions')) return res.status(403).json({ error: 'You cannot view fee history for this branch.' });
  const history = await prisma.feeAccessOverride.findMany({ where: { tenantId: req.tenantId!, branchId, studentId: req.params.studentId }, orderBy: { createdAt: 'desc' } });
  return res.json({ history });
});

router.get('/social-drafts', async (req: TenantRequest, res: Response) => {
  const branchId = String(req.query.branchId || '');
  if (!branchAllowed(req, branchId, 'draft_social_media')) return res.status(403).json({ error: 'You cannot view drafts for this branch.' });
  return res.json({ drafts: await prisma.branchSocialDraft.findMany({ where: { tenantId: req.tenantId!, branchId, authorId: req.user!.id }, orderBy: { updatedAt: 'desc' } }) });
});

router.post('/social-drafts', async (req: TenantRequest, res: Response) => {
  const { branchId, platforms, mediaUrls, proposedTime } = req.body; const text = String(req.body.text || '').trim();
  if (!branchAllowed(req, branchId, 'draft_social_media')) return res.status(403).json({ error: 'You cannot draft posts for this branch.' });
  if (!text || !Array.isArray(platforms) || platforms.length === 0) return res.status(400).json({ error: 'Post text and at least one platform are required.' });
  const draft = await prisma.branchSocialDraft.create({ data: { tenantId: req.tenantId!, branchId, authorId: req.user!.id, text, platforms, mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [], proposedTime: proposedTime ? new Date(proposedTime) : null, status: 'PENDING_APPROVAL' } });
  return res.status(201).json({ message: 'Draft submitted to Tenant Admin. It has not been published.', draft });
});

router.put('/social-drafts/:id', async (req: TenantRequest, res: Response) => {
  const existing = await prisma.branchSocialDraft.findFirst({ where: { id: req.params.id, tenantId: req.tenantId!, authorId: req.user!.id, status: { in: ['DRAFT', 'PENDING_APPROVAL'] } } });
  if (!existing) return res.status(409).json({ error: 'Only your own unreviewed drafts can be edited.' });
  const draft = await prisma.branchSocialDraft.update({ where: { id: existing.id }, data: { text: String(req.body.text || existing.text).trim(), platforms: Array.isArray(req.body.platforms) ? req.body.platforms : existing.platforms, proposedTime: req.body.proposedTime ? new Date(req.body.proposedTime) : existing.proposedTime } });
  return res.json({ message: 'Draft updated.', draft });
});

router.delete('/social-drafts/:id', async (req: TenantRequest, res: Response) => {
  const result = await prisma.branchSocialDraft.deleteMany({ where: { id: req.params.id, tenantId: req.tenantId!, authorId: req.user!.id, status: { in: ['DRAFT', 'PENDING_APPROVAL'] } } });
  if (!result.count) return res.status(409).json({ error: 'Only your own unreviewed drafts can be deleted.' });
  return res.status(204).send();
});

export default router;
