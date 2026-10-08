import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Actor } from '../../audit/audit-actor';
import type { AuditActor } from '../../audit/audit-actor';
import { ROLES } from '../../common/constants/roles';
import { Roles } from '../../common/decorators/roles.decorator';
import { CatalogQueryDto } from '../../common/dto/catalog-query.dto';
import { SetActiveDto } from '../../common/dto/set-active.dto';
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe';
import { DeliveryPlacesService } from './delivery-places.service';
import { CreateDeliveryPlaceDto } from './dto/create-delivery-place.dto';
import { UpdateDeliveryPlaceDto } from './dto/update-delivery-place.dto';
import { DeliveryPlace } from './entities/delivery-place.entity';

@ApiTags('Catálogos: lugares de entrega')
@Controller('delivery-places')
export class DeliveryPlacesController {
  constructor(private readonly places: DeliveryPlacesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista los lugares de entrega (activos por defecto)',
  })
  findAll(@Query() query: CatalogQueryDto): Promise<DeliveryPlace[]> {
    return this.places.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un lugar de entrega' })
  findOne(@Param('id', UuidParamPipe) id: string): Promise<DeliveryPlace> {
    return this.places.findOne(id);
  }

  @Post()
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Crea un lugar de entrega' })
  create(
    @Body() dto: CreateDeliveryPlaceDto,
    @Actor() actor: AuditActor,
  ): Promise<DeliveryPlace> {
    return this.places.create(dto, actor);
  }

  @Patch(':id')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Renombra un lugar de entrega' })
  update(
    @Param('id', UuidParamPipe) id: string,
    @Body() dto: UpdateDeliveryPlaceDto,
    @Actor() actor: AuditActor,
  ): Promise<DeliveryPlace> {
    return this.places.update(id, dto, actor);
  }

  @Patch(':id/active')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Activa o desactiva un lugar de entrega' })
  setActive(
    @Param('id', UuidParamPipe) id: string,
    @Body() dto: SetActiveDto,
    @Actor() actor: AuditActor,
  ): Promise<DeliveryPlace> {
    return this.places.setActive(id, dto.isActive, actor);
  }
}
