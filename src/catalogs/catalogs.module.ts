import { Module } from '@nestjs/common';
import { DeliveryPlacesModule } from './delivery-places/delivery-places.module';
import { DocumentTypesModule } from './document-types/document-types.module';
import { MacroRegionsModule } from './macro-regions/macro-regions.module';
import { ParticipantTypesModule } from './participant-types/participant-types.module';
import { SportsModule } from './sports/sports.module';

/** Agrupa los catálogos. Lectura: cualquier autenticado. Escritura: ADMIN. */
@Module({
  imports: [
    DeliveryPlacesModule,
    ParticipantTypesModule,
    MacroRegionsModule,
    SportsModule,
    DocumentTypesModule,
  ],
  exports: [
    DeliveryPlacesModule,
    ParticipantTypesModule,
    MacroRegionsModule,
    SportsModule,
    DocumentTypesModule,
  ],
})
export class CatalogsModule {}
