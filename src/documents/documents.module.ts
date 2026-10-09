import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { AuditModule } from '../audit/audit.module';
import { DocumentTypesModule } from '../catalogs/document-types/document-types.module';
import { EligibilityModule } from '../eligibility/eligibility.module';
import { StorageModule } from '../storage/storage.module';
import { DocumentsService } from './documents.service';
import { ParticipantDocumentsController } from './participant-documents.controller';
import { ResolutionsController } from './resolutions.controller';

@Module({
  imports: [
    // En memoria: el archivo se valida y se envía al proveedor sin tocar el disco.
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        limits: {
          fileSize: config.getOrThrow<number>('UPLOAD_MAX_BYTES'),
          files: 1,
        },
      }),
    }),
    DocumentTypesModule,
    StorageModule,
    EligibilityModule,
    AuditModule,
  ],
  controllers: [ParticipantDocumentsController, ResolutionsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
