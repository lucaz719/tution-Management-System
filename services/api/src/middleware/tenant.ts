import { Request, Response, NextFunction } from 'express';

export interface TenantRequest extends Request {
  tenantId?: string;
  user?: any;
}

export function tenantMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  // 1. Check path to see if it bypasses tenant constraints
  // /api/auth is exempt because the tenant is derived from the user record at login,
  // before the client can know its tenant ID.
  const bypassPaths = ['/api/auth', '/api/onboarding', '/api/health', '/api/certificates/verify'];
  if (bypassPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // 2. Try to extract tenantId from custom headers
  let tenantId = req.headers['x-tenant-id'] as string;

  // 3. Fall back to authenticated user context (if loaded from authMiddleware)
  if (!tenantId && req.user) {
    tenantId = req.user.tenantId;
  }

  if (!tenantId) {
    return res.status(400).json({
      error: 'Tenant context is missing. Please provide the x-tenant-id header or ensure you are authenticated.',
    });
  }

  req.tenantId = tenantId;
  next();
}
