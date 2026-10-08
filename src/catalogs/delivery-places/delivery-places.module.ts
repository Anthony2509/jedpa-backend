import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../../audit/audit.module';
import { DeliveryPlacesController } from './delivery-places.controller';
import { DeliveryPlacesService } from './delivery-places.service';
import { DeliveryPlace } from './entities/delivery-place.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryPlace]), AuditModule],
  controllers: [DeliveryPlacesController],
  providers: [DeliveryPlacesService],
  exports: [DeliveryPlacesService],
})
export class DeliveryPlacesModule {}
