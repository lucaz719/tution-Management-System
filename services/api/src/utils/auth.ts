import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { customSession } from 'better-auth/plugins';
import bcrypt from 'bcryptjs';
import prisma from './db';

const authSecret = process.env.BETTER_AUTH_SECRET;
if (!authSecret) {
  throw new Error('BETTER_AUTH_SECRET is required before starting the API.');
}

export const auth = betterAuth({
  secret: authSecret,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  user: {
    additionalFields: {
      tenantId: { type: 'string', required: true, input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    password: {
      hash: (password) => bcrypt.hash(password, 10),
      verify: ({ password, hash }) => bcrypt.compare(password, hash),
    },
    revokeSessionsOnPasswordReset: true,
  },
  session: {
    expiresIn: 60 * 60 * 24,
    updateAge: 60 * 60,
  },
  plugins: [
    customSession(async ({ user, session }) => {
      const assignments = await prisma.userRole.findMany({
        where: { userId: user.id },
        include: { role: true },
      });
      return {
        user: {
          ...user,
          roles: assignments.map((assignment) => ({
            roleName: assignment.role.name,
            permissions: Array.isArray(assignment.role.permissions)
              ? (assignment.role.permissions as string[])
              : [],
            branchId: assignment.branchId,
          })),
        },
        session,
      };
    }),
  ],
});
