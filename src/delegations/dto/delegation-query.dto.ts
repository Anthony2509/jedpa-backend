import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';
import { toBoolean } from '../../common/utils/query';
import { trimUpper } from '../../common/utils/text';
import { DelegationGender } from '../entities/delegation.entity';

export class DelegationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Busca por código (p. ej. M1-AJD)' })
  @IsOptional()
  @Transform(trimUpper)
  @IsString()
  @MaxLength(30)
  search?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'macroRegionId debe ser un UUID válido.' })
  macroRegionId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'sportId debe ser un UUID válido.' })
  sportId?: string;

  @ApiPropertyOptional({ example: 'B' })
  @IsOptional()
  @Transform(trimUpper)
  @Matches(/^[A-Z]$/, { message: 'La categoría debe ser una sola letra.' })
  category?: string;

  @ApiPropertyOptional({ enum: DelegationGender })
  @IsOptional()
  @IsEnum(DelegationGender, { message: 'El género debe ser D o V.' })
  gender?: DelegationGender;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: 'isActive debe ser true o false' })
  isActive?: boolean;
}
