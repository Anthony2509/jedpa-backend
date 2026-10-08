import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';
import { toBoolean } from '../../common/utils/query';
import { trim } from '../../common/utils/text';

export class UserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Busca por nombre o correo' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'roleId debe ser un UUID válido.' })
  roleId?: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: 'isActive debe ser true o false' })
  isActive?: boolean;
}
