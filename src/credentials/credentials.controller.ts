import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Actor } from '../audit/audit-actor';
import type { AuditActor } from '../audit/audit-actor';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { ROLES } from '../common/constants/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UuidParamPipe } from '../common/pipes/uuid-param.pipe';
import { CredentialsService } from './credentials.service';
import { CredentialCopyDto } from './dto/credential-copy.dto';
import { IssueCredentialDto } from './dto/issue-credential.dto';

@ApiTags('Credenciales')
@Controller('participants/:participantId/credentials')
export class CredentialsController {
  constructor(private readonly credentials: CredentialsService) {}

  @Get()
  @ApiOperation({ summary: 'Ejemplares impresos (original y duplicados)' })
  list(
    @Param('participantId', UuidParamPipe) participantId: string,
  ): Promise<CredentialCopyDto[]> {
    return this.credentials.list(participantId);
  }

  @Post()
  @Roles(ROLES.ADMIN, ROLES.COORDINATOR, ROLES.OPERATOR)
  @ApiOperation({
    summary: 'Registra la impresión del siguiente ejemplar',
    description:
      'Original y luego hasta 3 duplicados (con motivo obligatorio). Requiere los documentos en regla. ' +
      'Un duplicado revoca el QR de los anteriores. El participante queda PRINTED (no entregado). ' +
      'Para reimprimir el MISMO ejemplar (atasco de papel) vuelva a descargar su PDF: no cree otro.',
  })
  issue(
    @Param('participantId', UuidParamPipe) participantId: string,
    @Body() dto: IssueCredentialDto,
    @CurrentUser() user: AuthUser,
    @Actor() actor: AuditActor,
  ): Promise<CredentialCopyDto> {
    return this.credentials.issue(participantId, dto, user, actor);
  }
}
