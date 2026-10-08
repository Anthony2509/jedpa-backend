import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '../common/constants/security';
import { toAuthUser, UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/auth-user.interface';

const INVALID_CREDENTIALS = 'Correo o contraseña incorrectos.';

@Injectable()
export class AuthService {
  /** Hash ficticio: iguala el tiempo de respuesta cuando el correo no existe. */
  private readonly dummyHash = bcrypt.hashSync(
    'jedpa-dummy-password',
    BCRYPT_ROUNDS,
  );

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login({ email, password }: LoginDto): Promise<LoginResponseDto> {
    const user = await this.users.findForLogin(email);
    const passwordOk = await bcrypt.compare(
      password,
      user?.passwordHash ?? this.dummyHash,
    );

    // Mismo mensaje para correo inexistente, contraseña errónea o usuario inactivo.
    if (!user || !passwordOk || !user.isActive) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    await this.users.registerLogin(user.id);
    const payload: JwtPayload = { sub: user.id };
    return {
      accessToken: await this.jwt.signAsync(payload),
      expiresIn: this.config.getOrThrow<string>('JWT_EXPIRES_IN'),
      user: toAuthUser(user),
    };
  }
}
