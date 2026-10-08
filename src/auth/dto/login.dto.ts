import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { trimLower } from '../../common/utils/text';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@jedpa.pe' })
  @Transform(trimLower)
  @IsEmail({}, { message: 'El correo no es válido.' })
  @MaxLength(150)
  email: string;

  @ApiProperty({ example: '********' })
  @IsString({ message: 'La contraseña es obligatoria.' })
  @MinLength(1, { message: 'La contraseña es obligatoria.' })
  @MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres.' })
  password: string;
}
