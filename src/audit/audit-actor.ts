import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

/** Quién ejecuta la acción auditada. userId null = sistema. */
export interface AuditActor {
  userId: string | null;
  ip: string | null;
}

/** Inyecta el actor (usuario autenticado + IP) para registrar auditoría. */
export const Actor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuditActor => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    return { userId: req.user?.id ?? null, ip: req.ip ?? null };
  },
);
