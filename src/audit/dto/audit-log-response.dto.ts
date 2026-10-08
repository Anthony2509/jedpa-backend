import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction } from '../enums/audit-action.enum';

export class AuditUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;
}

export class AuditLogResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: AuditAction })
  action: AuditAction;

  @ApiProperty({ example: 'Participant' })
  entity: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  entityId: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  participantId: string | null;

  @ApiPropertyOptional({
    description: 'Campo afectado → { old, new }',
    example: { firstNames: { old: 'JUAN', new: 'JUAN CARLOS' } },
    nullable: true,
  })
  changes: Record<string, { old: unknown; new: unknown }> | null;

  @ApiPropertyOptional({ nullable: true })
  ip: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({
    type: AuditUserDto,
    nullable: true,
    description: 'null = acción del sistema',
  })
  user: AuditUserDto | null;
}
