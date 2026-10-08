import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** Cuerpo de PATCH /:id/active (activar o desactivar; nunca borrado físico). */
export class SetActiveDto {
  @ApiProperty({ example: false })
  @IsBoolean({ message: 'isActive debe ser verdadero o falso' })
  isActive: boolean;
}
