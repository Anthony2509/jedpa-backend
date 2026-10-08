import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser } from '../../auth/interfaces/auth-user.interface';
import { ROLES, RoleName } from '../constants/roles';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const contextFor = (user?: Partial<AuthUser>) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  const guardWith = (meta: { roles?: RoleName[]; isPublic?: boolean }) => {
    const reflector = {
      getAllAndOverride: (key: string) =>
        key === IS_PUBLIC_KEY ? meta.isPublic : meta.roles,
    } as unknown as Reflector;
    return new RolesGuard(reflector);
  };

  it('permite rutas sin @Roles a cualquier autenticado', () => {
    expect(
      guardWith({}).canActivate(contextFor({ role: ROLES.OPERATOR })),
    ).toBe(true);
  });

  it('permite rutas públicas sin usuario', () => {
    expect(
      guardWith({ isPublic: true, roles: [ROLES.ADMIN] }).canActivate(
        contextFor(undefined),
      ),
    ).toBe(true);
  });

  it('permite el rol incluido en @Roles', () => {
    expect(
      guardWith({ roles: [ROLES.ADMIN, ROLES.COORDINATOR] }).canActivate(
        contextFor({ role: ROLES.COORDINATOR }),
      ),
    ).toBe(true);
  });

  it('rechaza con 403 un rol no incluido', () => {
    expect(() =>
      guardWith({ roles: [ROLES.ADMIN] }).canActivate(
        contextFor({ role: ROLES.OPERATOR }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('usa la clave de metadatos de @Roles', () => {
    expect(ROLES_KEY).toBe('roles');
  });
});
