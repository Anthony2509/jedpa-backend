import { RoleName } from '../../common/constants/roles';

/** Usuario autenticado disponible en request.user. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: RoleName;
}

export interface JwtPayload {
  sub: string;
}
