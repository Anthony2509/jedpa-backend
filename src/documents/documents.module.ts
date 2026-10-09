import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { UploadModule } from '../common/upload.module';
import { DocumentTypesModule } from '../catalogs/document-types/document-types.module';
import { EligibilityModule } from '../eligibility/eligibility.module';
import { StorageModule } from '../storage/storage.module';
import { DocumentsService } from './documents.service';
import { ParticipantDocumentsController } from './participant-documents.controller';
import { ResolutionsController } from './resolutions.controller';

@Module({
  imports: [
    UploadModule,
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
