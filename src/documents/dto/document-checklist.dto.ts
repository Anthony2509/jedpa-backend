import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ParticipantStatus } from '../../participants/enums';
import { DocumentStatus } from '../enums/document-status.enum';

export class ChecklistDocumentTypeDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'CERTIFICADO_MEDICO' })
  code: string;

  @ApiProperty({ example: 'Certificado médico' })
  name: string;

  @ApiProperty({ description: 'Contiene datos de salud' })
  isSensitive: boolean;
}

export class ChecklistFileDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  originalName: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType: string;

  @ApiProperty()
  sizeBytes: number;

  @ApiProperty()
  uploadedAt: Date;
}

export class ChecklistReviewerDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  fullName: string;
}

export class ChecklistItemDto {
  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description:
      'Id del documento (entityId en la auditoría); null si aún no existe',
  })
  id: string | null;

  @ApiProperty({ type: ChecklistDocumentTypeDto })
  documentType: ChecklistDocumentTypeDto;

  @ApiProperty({ description: 'Obligatorio para el tipo de participante' })
  required: boolean;

  @ApiProperty({ enum: DocumentStatus })
  status: DocumentStatus;

  @ApiPropertyOptional({ nullable: true })
  observation: string | null;

  @ApiPropertyOptional({ type: ChecklistFileDto, nullable: true })
  file: ChecklistFileDto | null;

  @ApiPropertyOptional({ type: ChecklistReviewerDto, nullable: true })
  reviewedBy: ChecklistReviewerDto | null;

  @ApiPropertyOptional({ nullable: true })
  reviewedAt: Date | null;
}

export class EligibilityDto {
  @ApiProperty({ enum: ParticipantStatus, description: 'Estado del flujo' })
  status: ParticipantStatus;

  @ApiProperty({
    enum: ParticipantStatus,
    description: 'Situación según los documentos (ignora la fase de impresión)',
  })
  documentStatus: ParticipantStatus;

  @ApiProperty({ description: 'Se puede imprimir (original o duplicado)' })
  canPrint: boolean;
}

export class DocumentChecklistDto {
  @ApiProperty({ format: 'uuid' })
  participantId: string;

  @ApiProperty({ type: EligibilityDto })
  eligibility: EligibilityDto;

  @ApiProperty({ type: ChecklistItemDto, isArray: true })
  documents: ChecklistItemDto[];
}

export class FileUrlDto {
  @ApiProperty({ description: 'Enlace temporal de solo lectura' })
  url: string;

  @ApiProperty()
  expiresAt: Date;
}
