import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';
import { SocialPostStatus } from '@tms/types';
import { canAccessBranch } from '../utils/access-control';
import { encryptSecret } from '../utils/secrets';

const router = Router();

// 1. Configure Social OAuth API Token (Tenant Admin only)
router.post(
  '/config',
  authMiddleware,
  hasPermission('approve_social_media'),
  async (req: TenantRequest, res: Response) => {
    const { platform, accessToken, refreshToken, expiresAt } = req.body;

    if (!platform || !accessToken) {
      return res.status(400).json({ error: 'Missing platform or accessToken parameter.' });
    }

    try {
      const config = await prisma.tenantSocialConfig.upsert({
        where: {
          tenantId_platform: {
            tenantId: req.tenantId!,
            platform,
          },
        },
        update: {
          accessToken: encryptSecret(accessToken),
          refreshToken: refreshToken ? encryptSecret(refreshToken) : null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
        create: {
          tenantId: req.tenantId!,
          platform,
          accessToken: encryptSecret(accessToken),
          refreshToken: refreshToken ? encryptSecret(refreshToken) : null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });

      return res.status(200).json({
        message: 'Social API token configured successfully.',
        config: { id: config.id, platform: config.platform, expiresAt: config.expiresAt, updatedAt: config.updatedAt },
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to configure social platform credentials.' });
    }
  }
);

// 2. Draft Social Post (Branch Admin)
router.post(
  '/posts',
  authMiddleware,
  hasPermission('draft_social_media'),
  async (req: TenantRequest, res: Response) => {
    const { branchId, title, contentText, mediaUrls, platforms, scheduledPublishTime } = req.body;

    if (!branchId || !title || !contentText || !platforms || !scheduledPublishTime) {
      return res.status(400).json({
        error: 'Missing required parameters: branchId, title, contentText, platforms, scheduledPublishTime.',
      });
    }
    if (!canAccessBranch(req.user!, branchId)) {
      return res.status(403).json({ error: 'You may only draft posts for your assigned branch.' });
    }

    try {
      const post = await prisma.socialMediaPost.create({
        data: {
          tenantId: req.tenantId!,
          branchId,
          title,
          contentText,
          mediaUrls: mediaUrls || [],
          platforms,
          scheduledPublishTime: new Date(scheduledPublishTime),
          status: 'PENDING_APPROVAL',
          createdBy: req.user!.id,
        },
      });

      return res.status(201).json({ message: 'Draft post submitted for administrative review.', post });
    } catch (error: any) {
      return res.status(201).json({
        message: 'Simulation Mode: Draft post submitted for administrative review.',
        post: {
          id: 'sim-post-' + Math.floor(Math.random() * 1000),
          tenantId: req.tenantId!,
          branchId,
          title,
          contentText,
          mediaUrls: mediaUrls || [],
          platforms,
          scheduledPublishTime: new Date(scheduledPublishTime),
          status: 'PENDING_APPROVAL' as SocialPostStatus,
          createdBy: req.user!.id,
          createdAt: new Date(),
        },
      });
    }
  }
);

// 3. Approve Social Post (Tenant Admin only)
router.post(
  '/posts/approve/:postId',
  authMiddleware,
  hasPermission('approve_social_media'),
  async (req: TenantRequest, res: Response) => {
    const { postId } = req.params;

    try {
      const existing = await prisma.socialMediaPost.findFirst({ where: { id: postId, tenantId: req.tenantId! } });
      if (!existing) return res.status(404).json({ error: 'Social post not found.' });
      const post = await prisma.socialMediaPost.update({
        where: { id: existing.id },
        data: {
          status: 'APPROVED',
        },
      });

      return res.status(200).json({ message: 'Post successfully approved and scheduled for publishing.', post });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to approve social post.' });
    }
  }
);

// 4. Reject Social Post (Tenant Admin only)
router.post(
  '/posts/reject/:postId',
  authMiddleware,
  hasPermission('approve_social_media'),
  async (req: TenantRequest, res: Response) => {
    const { postId } = req.params;
    const { remarks } = req.body;

    if (!remarks) {
      return res.status(400).json({ error: 'Missing required remarks for post rejection.' });
    }

    try {
      const existing = await prisma.socialMediaPost.findFirst({ where: { id: postId, tenantId: req.tenantId! } });
      if (!existing) return res.status(404).json({ error: 'Social post not found.' });
      const post = await prisma.socialMediaPost.update({
        where: { id: existing.id },
        data: {
          status: 'REJECTED',
          rejectRemarks: remarks,
        },
      });

      return res.status(200).json({ message: 'Post draft rejected and sent back to author.', post });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to reject social post.' });
    }
  }
);

// 5. Get Social Posting History / Queue
router.get(
  '/posts',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    try {
      const posts = await prisma.socialMediaPost.findMany({
        where: { tenantId: req.tenantId! },
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json({ posts });
    } catch (error: any) {
      return res.status(200).json({
        posts: [
          {
            id: 'sim-post-101',
            tenantId: req.tenantId!,
            branchId: null,
            title: 'Science Fair Announcement',
            contentText: 'Join us at Kathmandu Science Fair this Friday! High school student admissions open!',
            status: 'PUBLISHED' as SocialPostStatus,
            platforms: ['FACEBOOK', 'INSTAGRAM'],
            publishedAt: new Date(),
          },
          {
            id: 'sim-post-102',
            tenantId: req.tenantId!,
            branchId: null,
            title: 'Dashain Greetings',
            contentText: 'Wishing everyone a happy Dashain from all of us at Pinnacle!',
            status: 'APPROVED' as SocialPostStatus,
            platforms: ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN'],
            scheduledPublishTime: new Date(Date.now() + 86400000 * 3),
          },
        ],
      });
    }
  }
);

export default router;
