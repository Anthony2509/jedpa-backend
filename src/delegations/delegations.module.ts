import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { MacroRegionsModule } from '../catalogs/macro-regions/macro-regions.module';
import { SportsModule } from '../catalogs/sports/sports.module';
import { DelegationsController } from './delegations.controller';
import { DelegationsService } from './delegations.service';
import { Delegation } from './entities/delegation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Delegation]),
    MacroRegionsModule,
    SportsModule,
    AuditModule,
  ],
  controllers: [DelegationsController],
  providers: [DelegationsService],
  exports: [DelegationsService],
})
export class DelegationsModule {}
