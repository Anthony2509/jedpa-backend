import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { UploadModule } from '../common/upload.module';
import { ParticipantTypesModule } from '../catalogs/participant-types/participant-types.module';
import { DelegationsModule } from '../delegations/delegations.module';
import { EligibilityModule } from '../eligibility/eligibility.module';
import { Participant } from './entities/participant.entity';
import { ParticipantImportController } from './import/participant-import.controller';
import { ParticipantImportService } from './import/participant-import.service';
import { ParticipantsController } from './participants.controller';
import { ParticipantsService } from './participants.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Participant]),
    ParticipantTypesModule,
    DelegationsModule,
    AuditModule,
    EligibilityModule,
    UploadModule,
  ],
  // La importación va primero: su ruta fija no debe confundirse con :id.
  controllers: [ParticipantImportController, ParticipantsController],
  providers: [ParticipantsService, ParticipantImportService],
  exports: [ParticipantsService],
})
export class ParticipantsModule {}
