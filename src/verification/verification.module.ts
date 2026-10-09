import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';

@Module({
  imports: [DocumentsModule],
  controllers: [VerificationController],
  providers: [VerificationService],
})
export class VerificationModule {}
