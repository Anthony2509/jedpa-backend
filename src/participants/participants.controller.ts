import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Actor } from '../audit/audit-actor';
import type { AuditActor } from '../audit/audit-actor';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { ROLES } from '../common/constants/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SetActiveDto } from '../common/dto/set-active.dto';
import { PaginatedResponse } from '../common/pagination';
import { UuidParamPipe } from '../common/pipes/uuid-param.pipe';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { ParticipantQueryDto } from './dto/participant-query.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { Participant } from './entities/participant.entity';
import { ParticipantsService } from './participants.service';

@ApiTags('Participantes')
@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participants: ParticipantsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista participantes con búsqueda y filtros' })
  findAll(
    @Query() query: ParticipantQueryDto,
  ): Promise<PaginatedResponse<Participant>> {
    return this.participants.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ficha de un participante' })
  findOne(@Param('id', UuidParamPipe) id: string): Promise<Participant> {
    return this.participants.findOne(id);
  }

  @Post()
  @Roles(ROLES.ADMIN, ROLES.COORDINATOR, ROLES.OPERATOR)
  @ApiOperation({
    summary: 'Registra un participante',
    description:
      'Tipos regulares: delegación, género y fecha de nacimiento obligatorios; estado inicial PENDING_DOCUMENTS. ' +
      'Tipos especiales (solo ADMIN y COORDINADOR): institución obligatoria; estado inicial READY_TO_PRINT.',
  })
  @ApiConflictResponse({ description: 'Documento ya registrado' })
  @ApiForbiddenResponse({ description: 'Rol sin permiso para el tipo' })
  create(
    @Body() dto: CreateParticipantDto,
    @CurrentUser() user: AuthUser,
    @Actor() actor: AuditActor,
  ): Promise<Participant> {
    return this.participants.create(dto, user, actor);
  }

  @Patch(':id')
  @Roles(ROLES.ADMIN, ROLES.COORDINATOR, ROLES.OPERATOR)
  @ApiOperation({
    summary: 'Edita los datos de un participante (no su estado)',
    description:
      'Enviar null en un campo opcional lo vacía. Cambiar a un tipo de otra categoría recalcula el estado.',
  })
  update(
    @Param('id', UuidParamPipe) id: string,
    @Body() dto: UpdateParticipantDto,
    @CurrentUser() user: AuthUser,
    @Actor() actor: AuditActor,
  ): Promise<Participant> {
    return this.participants.update(id, dto, user, actor);
  }

  @Patch(':id/active')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Activa o desactiva un participante' })
  setActive(
    @Param('id', UuidParamPipe) id: string,
    @Body() dto: SetActiveDto,
    @Actor() actor: AuditActor,
  ): Promise<Participant> {
    return this.participants.setActive(id, dto.isActive, actor);
  }
}
