import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_DUPLICATES } from '../entities/credential-copy.entity';
import { trim } from '../../common/utils/text';

export class IssueCredentialDto {
  @ApiProperty({
    example: 0,
    description:
      'Ejemplar que se espera emitir (0 = original, 1..3 = duplicados). Si no coincide con el siguiente real responde 409: evita duplicados por doble clic.',
  })
  @IsInt({ message: 'copyNumber debe ser un número entero.' })
  @Min(0)
  @Max(MAX_DUPLICATES, { message: 'Máximo ' + MAX_DUPLICATES + ' duplicados.' })
  copyNumber: number;

  @ApiPropertyOptional({
    example: 'Pérdida reportada por el delegado',
    description: 'Obligatorio para duplicados',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300, { message: 'El motivo no puede superar 300 caracteres.' })
  reason?: string;
}
