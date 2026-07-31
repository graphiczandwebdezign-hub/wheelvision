import { NextRequest } from 'next/server';
import { apiDetailResponse } from '@/server/utils/api-response';
import { handleApiError } from '@/server/middleware/error-handler';
import { prisma } from '@/server/utils/prisma';
import { hashPassword, verifyPassword, generateToken } from '@/server/auth/crypto';
import { AppError } from '@/server/utils/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === 'login') {
      const { email, password } = body;
      const user = await prisma.user.findUnique({
        where: { email },
        include: { userRoles: { include: { role: true } } },
      });

      if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: { increment: 1 } },
          });
        }
        throw new AppError('Invalid email or password', { code: 'VALIDATION_ERROR', statusCode: 401 });
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new AppError('Account is temporarily locked due to repeated failed logins', {
          code: 'VALIDATION_ERROR',
          statusCode: 403,
        });
      }

      // Reset failed attempts on success
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });

      const token = generateToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await prisma.session.create({
        data: {
          userId: user.id,
          tenantId: user.tenantId,
          token,
          expiresAt,
          ipAddress: request.headers.get('x-forwarded-for') ?? '127.0.0.1',
          userAgent: request.headers.get('user-agent') ?? 'Unknown',
        },
      });

      // Audit log login
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          entityType: 'User',
          entityId: user.id,
          action: 'LOGIN',
          actorId: user.id,
          details: `User ${user.email} logged in successfully`,
        },
      });

      return apiDetailResponse({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.userRoles.map((ur) => ur.role.name),
        },
      });
    }

    if (action === 'register') {
      const { email, password, name, tenantId } = body;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new AppError('Email already registered', { code: 'VALIDATION_ERROR', statusCode: 400 });
      }

      const passwordHash = hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          tenantId: tenantId ?? (await prisma.tenant.findFirst())?.id ?? '',
          emailVerified: true,
        },
      });

      return apiDetailResponse({ id: user.id, email: user.email, name: user.name });
    }

    throw new AppError('Invalid auth action', { code: 'VALIDATION_ERROR', statusCode: 400 });
  } catch (error) {
    return handleApiError(error, 'Authentication failed');
  }
}
