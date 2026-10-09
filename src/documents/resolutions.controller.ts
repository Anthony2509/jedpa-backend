import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Actor } from '../audit/audit-actor';
import type { AuditActor } from '../audit/audit-actor';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { MacroRegion } from '../catalogs/macro-regions/entities/macro-region.entity';
import { ROLES } from '../common/constants/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UuidParamPipe } from '../common/pipes/uuid-param.pipe';
import { DocumentsService } from './documents.service';
import { FileUrlDto } from './dto/document-checklist.dto';
import {
  LinkResolutionDto,
  LinkResolutionResultDto,
} from './dto/link-resolution.dto';
import { FileUpload } from './upload-body.decorator';

@ApiTags('Resolución Directoral')
@Controller('macro-regions/:macroRegionId/resolution')
export class ResolutionsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post()
  @Roles(ROLES.ADMIN, ROLES.COORDINATOR)
  @FileUpload('PDF de la Resolución Directoral')
  @ApiOperation({
    summary: 'Carga (o reemplaza) la Resolución Directoral de la macrorregión',
    description:
      'Se sube una sola vez y luego se vincula a cada participante que figura en ella.',
  })
  upload(
    @Param('macroRegionId', UuidParamPipe) macroRegionId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
    @Actor() actor: AuditActor,
  ): Promise<MacroRegion> {
    return this.documents.uploadResolution(macroRegionId, file, user, actor);
  }

  @Get('file')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Enlace temporal para ver la Resolución Directoral',
  })
  fileUrl(
    @Param('macroRegionId', UuidParamPipe) macroRegionId: string,
    @Actor() actor: AuditActor,
  ): Promise<FileUrlDto> {
    return this.documents.resolutionUrl(macroRegionId, actor);
  }

  @Post('links')
  @Roles(ROLES.ADMIN, ROLES.COORDINATOR, ROLES.OPERATOR)
  @ApiOperation({
    summary: 'Vincula la resolución a participantes de la macrorregión',
    description:
      'Figurar en la resolución equivale a aprobar ese requisito. Recalcula el estado de cada participante.',
  })
  link(
    @Param('macroRegionId', UuidParamPipe) macroRegionId: string,
    @Body() dto: LinkResolutionDto,
    @CurrentUser() user: AuthUser,
    @Actor() actor: AuditActor,
  ): Promise<LinkResolutionResultDto> {
    return this.documents.linkResolution(
      macroRegionId,
      dto.participantIds,
      user,
      actor,
    );
  }
}
