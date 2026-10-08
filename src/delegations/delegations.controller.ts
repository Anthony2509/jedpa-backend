import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Actor } from '../audit/audit-actor';
import type { AuditActor } from '../audit/audit-actor';
import { ROLES } from '../common/constants/roles';
import { Roles } from '../common/decorators/roles.decorator';
import { SetActiveDto } from '../common/dto/set-active.dto';
import { PaginatedResponse } from '../common/pagination';
import { UuidParamPipe } from '../common/pipes/uuid-param.pipe';
import { DelegationsService } from './delegations.service';
import { CreateDelegationDto } from './dto/create-delegation.dto';
import { DelegationQueryDto } from './dto/delegation-query.dto';
import { UpdateDelegationDto } from './dto/update-delegation.dto';
import { Delegation } from './entities/delegation.entity';

@ApiTags('Delegaciones')
@Controller('delegations')
export class DelegationsController {
  constructor(private readonly delegations: DelegationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista delegaciones con filtros' })
  findAll(
    @Query() query: DelegationQueryDto,
  ): Promise<PaginatedResponse<Delegation>> {
    return this.delegations.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una delegación' })
  findOne(@Param('id', UuidParamPipe) id: string): Promise<Delegation> {
    return this.delegations.findOne(id);
  }

  @Post()
  @Roles(ROLES.ADMIN, ROLES.COORDINATOR)
  @ApiOperation({
    summary: 'Crea una delegación (el código M1-AJD-B-D se genera solo)',
  })
  create(
    @Body() dto: CreateDelegationDto,
    @Actor() actor: AuditActor,
  ): Promise<Delegation> {
    return this.delegations.create(dto, actor);
  }

  @Patch(':id')
  @Roles(ROLES.ADMIN, ROLES.COORDINATOR)
  @ApiOperation({ summary: 'Edita una delegación (recalcula el código)' })
  update(
    @Param('id', UuidParamPipe) id: string,
    @Body() dto: UpdateDelegationDto,
    @Actor() actor: AuditActor,
  ): Promise<Delegation> {
    return this.delegations.update(id, dto, actor);
  }

  @Patch(':id/active')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Activa o desactiva una delegación' })
  setActive(
    @Param('id', UuidParamPipe) id: string,
    @Body() dto: SetActiveDto,
    @Actor() actor: AuditActor,
  ): Promise<Delegation> {
    return this.delegations.setActive(id, dto.isActive, actor);
  }
}
