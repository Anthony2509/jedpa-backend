import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthUser } from '../../auth/interfaces/auth-user.interface';
import { RoleName } from '../constants/roles';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

/** Guard global: aplica @Roles(...). Se ejecuta después de JwtAuthGuard. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const roles = this.reflector.getAllAndOverride<RoleName[] | undefined>(
      ROLES_KEY,
      targets,
    );
    if (!roles?.length) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException(
        'No tiene permisos para realizar esta acción.',
      );
    }
    return true;
  }
}
