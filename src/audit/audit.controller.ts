import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ROLES } from '../common/constants/roles';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginatedResponse } from '../common/pagination';
import { AuditService } from './audit.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';

@ApiTags('Auditoría')
@Roles(ROLES.ADMIN)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'Historial de auditoría (solo lectura)',
    description:
      'Filtros por participante, usuario, acción, entidad y rango de fechas. Orden: más reciente primero.',
  })
  @ApiOkResponse({ type: AuditLogResponseDto, isArray: true })
  findAll(
    @Query() query: AuditLogQueryDto,
  ): Promise<PaginatedResponse<AuditLogResponseDto>> {
    return this.audit.findAll(query);
  }
}
