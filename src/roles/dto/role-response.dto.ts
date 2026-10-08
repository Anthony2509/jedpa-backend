import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ROLES } from '../../common/constants/roles';
import { Role } from '../entities/role.entity';

export class RoleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: Object.values(ROLES) })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  static from(role: Role): RoleResponseDto {
    return { id: role.id, name: role.name, description: role.description };
  }
}
