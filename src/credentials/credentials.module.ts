import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EligibilityModule } from '../eligibility/eligibility.module';
import { StorageModule } from '../storage/storage.module';
import { CredentialPdfService } from './credential-pdf.service';
import { CredentialsPrintController } from './credentials-print.controller';
import { CredentialsController } from './credentials.controller';
import { CredentialsService } from './credentials.service';

@Module({
  imports: [EligibilityModule, StorageModule, AuditModule],
  controllers: [CredentialsController, CredentialsPrintController],
  providers: [CredentialsService, CredentialPdfService],
  exports: [CredentialsService],
})
export class CredentialsModule {}
