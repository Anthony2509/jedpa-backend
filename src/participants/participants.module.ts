import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { ParticipantTypesModule } from '../catalogs/participant-types/participant-types.module';
import { DelegationsModule } from '../delegations/delegations.module';
import { Participant } from './entities/participant.entity';
import { ParticipantsController } from './participants.controller';
import { ParticipantsService } from './participants.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Participant]),
    ParticipantTypesModule,
    DelegationsModule,
    AuditModule,
  ],
  controllers: [ParticipantsController],
  providers: [ParticipantsService],
  exports: [ParticipantsService],
})
export class ParticipantsModule {}
