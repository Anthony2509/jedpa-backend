import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';
import { toBoolean } from '../../common/utils/query';
import { trim } from '../../common/utils/text';
import { ParticipantStatus } from '../enums';

export class ParticipantQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Busca por número de documento, nombres, apellidos o colegio. Cada palabra debe coincidir.',
    example: 'perez juan',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: ParticipantStatus })
  @IsOptional()
  @IsEnum(ParticipantStatus, { message: 'status no es un estado válido.' })
  status?: ParticipantStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'participantTypeId debe ser un UUID válido.' })
  participantTypeId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'delegationId debe ser un UUID válido.' })
  delegationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'macroRegionId debe ser un UUID válido.' })
  macroRegionId?: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: 'isActive debe ser true o false' })
  isActive?: boolean;
}
