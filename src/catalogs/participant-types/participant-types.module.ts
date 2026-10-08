import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParticipantType } from './entities/participant-type.entity';
import { ParticipantTypesController } from './participant-types.controller';
import { ParticipantTypesService } from './participant-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([ParticipantType])],
  controllers: [ParticipantTypesController],
  providers: [ParticipantTypesService],
  exports: [ParticipantTypesService],
})
export class ParticipantTypesModule {}
