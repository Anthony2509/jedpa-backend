import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { trim, trimLower } from '../../common/utils/text';

export const PASSWORD_RULES = {
  min: 12,
  max: 72, // límite de bcrypt
  pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
};

export class CreateUserDto {
  @ApiProperty({ example: 'coordinador@jedpa.pe' })
  @Transform(trimLower)
  @IsEmail({}, { message: 'El correo no es válido.' })
  @MaxLength(150, { message: 'El correo no puede superar 150 caracteres.' })
  email: string;

  @ApiProperty({ example: 'María Pérez' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es obligatorio.' })
  @MaxLength(150, { message: 'El nombre no puede superar 150 caracteres.' })
  fullName: string;

  @ApiProperty({
    minLength: PASSWORD_RULES.min,
    description: 'Mínimo 12 caracteres, con al menos una letra y un número.',
  })
  @IsString()
  @MinLength(PASSWORD_RULES.min, {
    message: 'La contraseña debe tener al menos 12 caracteres.',
  })
  @MaxLength(PASSWORD_RULES.max, {
    message: 'La contraseña no puede superar 72 caracteres.',
  })
  @Matches(PASSWORD_RULES.pattern, {
    message: 'La contraseña debe incluir al menos una letra y un número.',
  })
  password: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'roleId debe ser un UUID válido.' })
  roleId: string;
}
