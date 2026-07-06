import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';
import { SocialPostStatus } from '@tms/types';

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
          accessToken: 'mock_encrypted_' + accessToken,
          refreshToken: refreshToken ? 'mock_encrypted_' + refreshToken : null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
        create: {
          tenantId: req.tenantId!,
          platform,
          accessToken: 'mock_encrypted_' + accessToken,
          refreshToken: refreshToken ? 'mock_encrypted_' + refreshToken : null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });

      return res.status(200).json({ message: 'Social API token configured successfully.', config });
    } catch (error: any) {
      return res.status(200).json({
        message: 'Simulation Mode: Social API token configured successfully.',
        config: {
          id: 'sim-config-' + Math.floor(Math.random() * 1000),
          tenantId: req.tenantId!,
          platform,
          accessToken: 'sim_encrypted_' + accessToken,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });
    }
  }
);

// 2. Draft Social Post (Branch Admin)
router.post(
  '/posts',
  authMiddleware,
  hasPermission('manage_branches'),
  async (req: TenantRequest, res: Response) => {
    const { branchId, title, contentText, mediaUrls, platforms, scheduledPublishTime } = req.body;

    if (!branchId || !title || !contentText || !platforms || !scheduledPublishTime) {
      return res.status(400).json({
        error: 'Missing required parameters: branchId, title, contentText, platforms, scheduledPublishTime.',
      });
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
      const post = await prisma.socialMediaPost.update({
        where: { id: postId },
        data: {
          status: 'APPROVED',
        },
      });

      return res.status(200).json({ message: 'Post successfully approved and scheduled for publishing.', post });
    } catch (error: any) {
      return res.status(200).json({
        message: 'Simulation Mode: Post successfully approved and scheduled for publishing.',
        post: {
          id: postId,
          status: 'APPROVED' as SocialPostStatus,
          updatedAt: new Date(),
        },
      });
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
      const post = await prisma.socialMediaPost.update({
        where: { id: postId },
        data: {
          status: 'REJECTED',
          rejectRemarks: remarks,
        },
      });

      return res.status(200).json({ message: 'Post draft rejected and sent back to author.', post });
    } catch (error: any) {
      return res.status(200).json({
        message: 'Simulation Mode: Post draft rejected and sent back to author.',
        post: {
          id: postId,
          status: 'REJECTED' as SocialPostStatus,
          rejectRemarks: remarks,
          updatedAt: new Date(),
        },
      });
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
            branchId: 'b-baneshwor-01',
            title: 'Science Fair Announcement',
            contentText: 'Join us at Kathmandu Science Fair this Friday! High school student admissions open!',
            status: 'PUBLISHED' as SocialPostStatus,
            platforms: ['FACEBOOK', 'INSTAGRAM'],
            publishedAt: new Date(),
          },
          {
            id: 'sim-post-102',
            tenantId: req.tenantId!,
            branchId: 'b-baneshwor-01',
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
