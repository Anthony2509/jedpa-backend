import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Actor } from '../audit/audit-actor';
import type { AuditActor } from '../audit/audit-actor';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { ROLES } from '../common/constants/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UuidParamPipe } from '../common/pipes/uuid-param.pipe';
import { DocumentsService } from './documents.service';
import { DocumentChecklistDto, FileUrlDto } from './dto/document-checklist.dto';
import { ReviewDocumentDto } from './dto/review-document.dto';
import { FileUpload } from './upload-body.decorator';

const CODE_PARAM = {
  name: 'code',
  description: 'Código del tipo de documento (GET /api/document-types)',
  example: 'CERTIFICADO_MEDICO',
};

@ApiTags('Documentos del participante')
@Controller('participants/:participantId/documents')
export class ParticipantDocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Ficha documental: requisitos, estados, archivos y habilitación',
  })
  checklist(
    @Param('participantId', UuidParamPipe) participantId: string,
  ): Promise<DocumentChecklistDto> {
    return this.documents.checklist(participantId);
  }

  @Post(':code')
  @Roles(ROLES.ADMIN, ROLES.COORDINATOR, ROLES.OPERATOR)
  @FileUpload('PDF, JPG o PNG (la foto: solo JPG o PNG)')
  @ApiParam(CODE_PARAM)
  @ApiOperation({
    summary: 'Sube o reemplaza un documento',
    description:
      'El documento queda PENDING para revisión y el estado del participante se recalcula.',
  })
  upload(
    @Param('participantId', UuidParamPipe) participantId: string,
    @Param('code') code: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
    @Actor() actor: AuditActor,
  ): Promise<DocumentChecklistDto> {
    return this.documents.upload(participantId, code, file, user, actor);
  }

  @Patch(':code/review')
  @Roles(ROLES.ADMIN, ROLES.COORDINATOR, ROLES.OPERATOR)
  @ApiParam(CODE_PARAM)
  @ApiOperation({
    summary: 'Revisa un documento: aprobar, observar, no aplica o pendiente',
    description:
      'Aprobar requiere archivo; observar requiere observación. Registra revisor y fecha, y recalcula el estado.',
  })
  review(
    @Param('participantId', UuidParamPipe) participantId: string,
    @Param('code') code: string,
    @Body() dto: ReviewDocumentDto,
    @CurrentUser() user: AuthUser,
    @Actor() actor: AuditActor,
  ): Promise<DocumentChecklistDto> {
    return this.documents.review(participantId, code, dto, user, actor);
  }

  @Get(':code/file')
  @ApiParam(CODE_PARAM)
  @ApiOperation({ summary: 'Enlace temporal para ver el archivo' })
  fileUrl(
    @Param('participantId', UuidParamPipe) participantId: string,
    @Param('code') code: string,
  ): Promise<FileUrlDto> {
    return this.documents.fileUrl(participantId, code);
  }
}
