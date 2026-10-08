import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { toBoolean } from '../utils/query';

/** Los catálogos son pequeños: se devuelven completos (sin paginar), para selectores. */
export class CatalogQueryDto {
  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'Incluir registros desactivados',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: 'includeInactive debe ser true o false' })
  includeInactive?: boolean;
}
