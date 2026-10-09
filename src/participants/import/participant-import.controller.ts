import { Controller, HttpCode, Post, UploadedFile } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Actor } from '../../audit/audit-actor';
import type { AuditActor } from '../../audit/audit-actor';
import { ROLES } from '../../common/constants/roles';
import { FileUpload } from '../../common/decorators/file-upload.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { sanitizeFileName } from '../../storage/file-validation';
import { ImportPreviewDto, ImportResultDto } from './import.dto';
import { ParticipantImportService } from './participant-import.service';

@ApiTags('Importación del padrón')
@Roles(ROLES.ADMIN, ROLES.COORDINATOR)
@Controller('participants/import')
export class ParticipantImportController {
  constructor(private readonly imports: ParticipantImportService) {}

  @Post('preview')
  @HttpCode(200)
  @FileUpload(
    'Excel .xlsx con la hoja del padrón (columna DOCUMENTO DE IDENTIDAD)',
  )
  @ApiOperation({
    summary: 'Paso 1: valida el Excel fila por fila SIN guardar nada',
    description:
      'Informa filas válidas, errores por fila, participantes nuevos, ya registrados (se omitirán) y delegaciones a crear. ' +
      'Las columnas USUARIO y PASSWORD nunca se leen.',
  })
  preview(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<ImportPreviewDto> {
    return this.imports.preview(file);
  }

  @Post()
  @FileUpload('El mismo Excel validado en la vista previa')
  @ApiOperation({
    summary: 'Paso 2: importa el padrón en una sola transacción',
    description:
      'Si hay una sola fila con errores no se importa nada. Los ya registrados se omiten (no se sobrescriben). ' +
      'Cada participante y delegación creados quedan auditados como IMPORT.',
  })
  commit(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Actor() actor: AuditActor,
  ): Promise<ImportResultDto> {
    return this.imports.commit(
      file,
      sanitizeFileName(file?.originalname ?? 'padron.xlsx'),
      actor,
    );
  }
}
