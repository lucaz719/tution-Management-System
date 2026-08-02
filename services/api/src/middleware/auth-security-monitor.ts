import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import prisma from '../utils/db';
import { validateRuntimeConfig } from '../utils/runtime-config';

const { authSecret } = validateRuntimeConfig();

function sourceHash(req: Request): string {
  return crypto
    .createHmac('sha256', authSecret)
    .update(req.ip || req.socket.remoteAddress || 'unknown')
    .digest('base64url');
}

/** Records failed credential attempts without storing credentials, emails, or raw IP addresses. */
export function monitorCredentialSignIn(req: Request, res: Response, next: NextFunction): void {
  const isCredentialSignIn = req.method === 'POST'
    && req.originalUrl.split('?', 1)[0] === '/api/auth/sign-in/email';

  if (isCredentialSignIn) {
    res.once('finish', () => {
      if (res.statusCode !== 401 && res.statusCode !== 429) return;

      const event = res.statusCode === 429 ? 'AUTH_LOGIN_RATE_LIMITED' : 'AUTH_LOGIN_FAILED';
      void prisma.authSecurityEvent.create({
        data: { event, sourceHash: sourceHash(req), statusCode: res.statusCode },
      }).then(() => {
        console.warn(JSON.stringify({ event, statusCode: res.statusCode }));
      }).catch((error) => {
        console.error('Unable to record authentication security event.', error);
      });
    });
  }

  next();
}
