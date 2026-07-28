import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TenantRequest } from './tenant';
import { UserPayload } from '@tms/types';
import { auth } from '../utils/auth';
import { JWT_SECRET } from '../utils/env';

export async function authMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];

  // 1. Try to check Better Auth session first
  try {
    const session = await auth.api.getSession({
      headers: req.headers as Record<string, string>,
    });

    if (session && session.user) {
      const user = session.user as any;
      if (!user.tenantId) {
        return res.status(403).json({ error: 'Authenticated account has no institution scope.' });
      }
      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName || user.name?.split(' ')[0] || '',
        lastName: user.lastName || user.name?.split(' ')[1] || '',
        tenantId: user.tenantId,
        roles: user.roles || [],
      };
      req.tenantId = req.user.tenantId;
      return next();
    }
  } catch (err) {
    // Graceful fallback to JWT verification
  }

  // 2. Fallback to standard JWT check (for backward compatibility / simulated mode)
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    req.user = decoded;
    req.tenantId = decoded.tenantId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

// Permission checking middleware supporting branch-level scopes
export function hasPermission(requiredPermission: string) {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User is not authenticated.' });
    }

    const user = req.user as UserPayload;

    // 1. Super Admin global bypass
    const isSuperAdmin = user.roles.some(r => r.roleName === 'Super Admin');
    if (isSuperAdmin) {
      return next();
    }

    // 2. Tenant Admin global bypass (scoped to their specific tenant)
    const isTenantAdmin = user.roles.some(
      r => r.roleName === 'Tenant Admin' && user.tenantId === req.tenantId
    );
    if (isTenantAdmin) {
      return next();
    }

    // 3. Branch scope checking
    // Determine the active branch context from request parameters, body, query, or headers
    const branchId =
      req.params.branchId ||
      req.body.branchId ||
      req.query.branchId ||
      undefined;

    // Verify if the user has the required permission in a relevant branch context
    const hasAccess = user.roles.some(role => {
      // Must possess the exact permission
      const hasPerm = role.permissions.includes(requiredPermission);

      // Must be tenant-wide (branchId is null), match the exact branch,
      // or if no branch context is provided in the request, allow access at the middleware level
      const isCorrectBranch =
        role.branchId === null ||
        branchId === undefined ||
        role.branchId === branchId;

      return hasPerm && isCorrectBranch;
    });

    if (!hasAccess) {
      return res.status(403).json({
        error: `Forbidden. You do not have the required permission: '${requiredPermission}' for this branch or tenant.`,
      });
    }

    next();
  };
}
