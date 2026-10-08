import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MacroRegion } from './entities/macro-region.entity';
import { MacroRegionsController } from './macro-regions.controller';
import { MacroRegionsService } from './macro-regions.service';

@Module({
  imports: [TypeOrmModule.forFeature([MacroRegion])],
  controllers: [MacroRegionsController],
  providers: [MacroRegionsService],
  exports: [MacroRegionsService],
})
export class MacroRegionsModule {}
