import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccessLevel } from '../catalogs/participant-types/entities/participant-type.entity';
import { DocumentStatus } from '../documents/enums/document-status.enum';

export class VerifiedDocumentDto {
  @ApiProperty({ example: 'Certificado médico' })
  name: string;

  @ApiProperty({ enum: DocumentStatus })
  status: DocumentStatus;
}

export class VerifiedParticipantDto {
  @ApiProperty({ example: 'JUAN CARLOS PÉREZ QUISPE' })
  fullName: string;

  @ApiProperty({ example: 'Deportista' })
  participantType: string;

  @ApiPropertyOptional({ enum: AccessLevel, nullable: true })
  accessLevel: AccessLevel | null;

  @ApiPropertyOptional({ example: 'M1-AJD-B-D', nullable: true })
  delegation: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Solo credenciales especiales',
  })
  institution: string | null;
}

/**
 * Respuesta pública del QR: lo mínimo para el control en puerta.
 * Nunca incluye número de documento, foto ni archivos.
 */
export class VerificationDto {
  @ApiProperty({ description: 'La credencial existe y no fue reemplazada' })
  valid: boolean;

  @ApiProperty({ description: 'Documentación en regla y participante activo' })
  enabled: boolean;

  @ApiProperty({ example: 'Credencial válida. Participante habilitado.' })
  message: string;

  @ApiProperty({ example: 'Original' })
  credential: string;

  @ApiPropertyOptional({ type: VerifiedParticipantDto, nullable: true })
  participant: VerifiedParticipantDto | null;

  @ApiProperty({ type: VerifiedDocumentDto, isArray: true })
  documents: VerifiedDocumentDto[];
}
