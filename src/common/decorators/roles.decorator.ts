import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../constants/roles';

export const ROLES_KEY = 'roles';

/** Restringe la ruta a los roles indicados. Sin @Roles basta con estar autenticado. */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
