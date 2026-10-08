import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { AuthUserDto, LoginResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import type { AuthUser } from './interfaces/auth-user.interface';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Inicia sesión y devuelve un JWT' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Correo o contraseña incorrectos' })
  @ApiTooManyRequestsResponse({ description: 'Máximo 5 intentos por minuto' })
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.auth.login(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  @ApiOkResponse({ type: AuthUserDto })
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
