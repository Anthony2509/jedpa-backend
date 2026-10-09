import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EligibilityService } from './eligibility.service';

@Module({
  imports: [AuditModule],
  providers: [EligibilityService],
  exports: [EligibilityService],
})
export class EligibilityModule {}
