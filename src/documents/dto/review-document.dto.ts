import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { trim } from '../../common/utils/text';
import { DocumentStatus } from '../enums/document-status.enum';

export class ReviewDocumentDto {
  @ApiProperty({
    enum: DocumentStatus,
    description:
      'APPROVED (requiere archivo), OBSERVED (requiere observación), NOT_APPLICABLE o PENDING (deshacer)',
  })
  @IsEnum(DocumentStatus, {
    message: 'status debe ser APPROVED, OBSERVED, NOT_APPLICABLE o PENDING.',
  })
  status: DocumentStatus;

  @ApiPropertyOptional({
    example: 'El certificado médico está vencido.',
    description: 'Obligatoria al observar',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500, {
    message: 'La observación no puede superar 500 caracteres.',
  })
  observation?: string;
}
