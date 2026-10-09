import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Actor } from '../audit/audit-actor';
import type { AuditActor } from '../audit/audit-actor';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { ROLES } from '../common/constants/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UuidParamPipe } from '../common/pipes/uuid-param.pipe';
import { CredentialPdfService } from './credential-pdf.service';
import { pdfFile } from './pdf/pdf-response';
import { CredentialsService } from './credentials.service';
import { CredentialCopyDto } from './dto/credential-copy.dto';
import { IssueCredentialDto } from './dto/issue-credential.dto';

@ApiTags('Credenciales')
@Controller('participants/:participantId/credentials')
export class CredentialsController {
  constructor(
    private readonly credentials: CredentialsService,
    private readonly pdf: CredentialPdfService,
  ) {}

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

  @Get(':copyNumber/pdf')
  @Roles(ROLES.ADMIN, ROLES.COORDINATOR, ROLES.OPERATOR)
  @ApiProduces('application/pdf')
  @ApiOperation({
    summary:
      'PDF de un ejemplar (para imprimir o reimprimir el MISMO ejemplar)',
    description:
      'No crea duplicados: sirve ante un atasco de papel. Queda auditado. Un ejemplar reemplazado responde 409.',
  })
  async pdfOf(
    @Param('participantId', UuidParamPipe) participantId: string,
    @Param('copyNumber', ParseIntPipe) copyNumber: number,
    @CurrentUser() user: AuthUser,
    @Actor() actor: AuditActor,
  ): Promise<StreamableFile> {
    const copyId = await this.credentials.copyIdOf(participantId, copyNumber);
    return pdfFile(
      await this.pdf.render([copyId], user, actor),
      `credencial-${copyNumber}.pdf`,
    );
  }
}
