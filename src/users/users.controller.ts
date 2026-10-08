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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Actor } from '../audit/audit-actor';
import type { AuditActor } from '../audit/audit-actor';
import { ROLES } from '../common/constants/roles';
import { Roles } from '../common/decorators/roles.decorator';
import { SetActiveDto } from '../common/dto/set-active.dto';
import { PaginatedResponse } from '../common/pagination';
import { UuidParamPipe } from '../common/pipes/uuid-param.pipe';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Usuarios')
@Roles(ROLES.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lista usuarios (búsqueda por nombre o correo)' })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  findAll(
    @Query() query: UserQueryDto,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    return this.users.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un usuario' })
  @ApiOkResponse({ type: UserResponseDto })
  findOne(@Param('id', UuidParamPipe) id: string): Promise<UserResponseDto> {
    return this.users.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crea un usuario administrativo' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'Correo ya registrado' })
  create(
    @Body() dto: CreateUserDto,
    @Actor() actor: AuditActor,
  ): Promise<UserResponseDto> {
    return this.users.create(dto, actor);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita datos, rol o contraseña de un usuario' })
  @ApiOkResponse({ type: UserResponseDto })
  update(
    @Param('id', UuidParamPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Actor() actor: AuditActor,
  ): Promise<UserResponseDto> {
    return this.users.update(id, dto, actor);
  }

  @Patch(':id/active')
  @ApiOperation({ summary: 'Activa o desactiva un usuario' })
  @ApiOkResponse({ type: UserResponseDto })
  setActive(
    @Param('id', UuidParamPipe) id: string,
    @Body() dto: SetActiveDto,
    @Actor() actor: AuditActor,
  ): Promise<UserResponseDto> {
    return this.users.setActive(id, dto.isActive, actor);
  }
}
