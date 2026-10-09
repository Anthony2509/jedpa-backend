import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Actor } from '../audit/audit-actor';
import type { AuditActor } from '../audit/audit-actor';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { ROLES } from '../common/constants/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CredentialPdfService } from './credential-pdf.service';
import { CredentialsService } from './credentials.service';
import { pdfFile } from './pdf/pdf-response';
import {
  BatchIssueDto,
  BatchIssueResultDto,
  CopiesPdfDto,
} from './dto/batch.dto';

@ApiTags('Credenciales')
@Controller('credentials')
export class CredentialsPrintController {
  constructor(
    private readonly credentials: CredentialsService,
    private readonly pdf: CredentialPdfService,
  ) {}

  @Post('batch')
  @HttpCode(200)
  @Roles(ROLES.ADMIN, ROLES.COORDINATOR, ROLES.OPERATOR)
  @ApiOperation({
    summary: 'Emite el ORIGINAL de varios participantes (impresión en lote)',
    description:
      'Informa por separado los emitidos y los omitidos con su motivo (requisitos, ya impresos, permisos). ' +
      'Luego genere el PDF con POST /credentials/pdf.',
  })
  @ApiOkResponse({ type: BatchIssueResultDto })
  batch(
    @Body() dto: BatchIssueDto,
    @CurrentUser() user: AuthUser,
    @Actor() actor: AuditActor,
  ): Promise<BatchIssueResultDto> {
    return this.credentials.issueBatch(dto.participantIds, user, actor);
  }

  @Post('pdf')
  @HttpCode(200)
  @Roles(ROLES.ADMIN, ROLES.COORDINATOR, ROLES.OPERATOR)
  @ApiProduces('application/pdf')
  @ApiOperation({
    summary:
      'PDF de varios ejemplares vigentes (120 × 155 mm, anverso y reverso)',
  })
  async pdfOf(
    @Body() dto: CopiesPdfDto,
    @CurrentUser() user: AuthUser,
    @Actor() actor: AuditActor,
  ): Promise<StreamableFile> {
    return pdfFile(
      await this.pdf.render(dto.copyIds, user, actor),
      'credenciales.pdf',
    );
  }

  @Get('test-sheet')
  @Roles(ROLES.ADMIN, ROLES.COORDINATOR)
  @ApiProduces('application/pdf')
  @ApiOperation({
    summary: 'Hoja de prueba para calibrar la impresora',
    description:
      'Imprímala en papel común y superpóngala a una cartulina. Ajuste CREDENTIAL_OFFSET_X_MM / _Y_MM si hay desfase.',
  })
  async testSheet(): Promise<StreamableFile> {
    return pdfFile(await this.pdf.testSheet(), 'hoja-de-prueba.pdf');
  }
}
