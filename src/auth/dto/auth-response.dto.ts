import { ApiProperty } from '@nestjs/swagger';
import { ROLES } from '../../common/constants/roles';
import type { RoleName } from '../../common/constants/roles';

export class AuthUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty({ enum: Object.values(ROLES) })
  role: RoleName;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT para el encabezado Authorization: Bearer' })
  accessToken: string;

  @ApiProperty({ example: '8h' })
  expiresIn: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
