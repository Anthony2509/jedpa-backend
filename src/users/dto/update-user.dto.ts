import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

/** Todos los campos opcionales; la contraseña solo se cambia si se envía. */
export class UpdateUserDto extends PartialType(CreateUserDto) {}
