import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';
import { AuditAction } from '../enums/audit-action.enum';

export class AuditLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Historial de un participante',
  })
  @IsOptional()
  @IsUUID('4', { message: 'participantId debe ser un UUID' })
  participantId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Acciones de un usuario',
  })
  @IsOptional()
  @IsUUID('4', { message: 'userId debe ser un UUID' })
  userId?: string;

  @ApiPropertyOptional({ enum: AuditAction })
  @IsOptional()
  @IsEnum(AuditAction, { message: 'action no es una acción válida' })
  action?: AuditAction;

  @ApiPropertyOptional({ example: 'Participant' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  entity?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'entityId debe ser un UUID' })
  entityId?: string;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'Desde (inclusive)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'from debe ser una fecha ISO' })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-10-31',
    description: 'Hasta (inclusive)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'to debe ser una fecha ISO' })
  to?: string;
}
