import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EligibilityModule } from '../eligibility/eligibility.module';
import { CredentialsController } from './credentials.controller';
import { CredentialsService } from './credentials.service';

@Module({
  imports: [EligibilityModule, AuditModule],
  controllers: [CredentialsController],
  providers: [CredentialsService],
  exports: [CredentialsService],
})
export class CredentialsModule {}
