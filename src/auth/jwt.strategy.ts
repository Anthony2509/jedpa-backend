import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { AuthUser, JwtPayload } from './interfaces/auth-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /** Recarga el usuario en cada petición: desactivarlo corta su acceso al instante. */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.users.findActiveAuthUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Sesión inválida o expirada.');
    }
    return user;
  }
}
