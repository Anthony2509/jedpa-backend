import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogQueryDto } from '../../common/dto/catalog-query.dto';
import { MacroRegion } from './entities/macro-region.entity';
import { MacroRegionsService } from './macro-regions.service';

@ApiTags('Catálogos: macrorregiones')
@Controller('macro-regions')
export class MacroRegionsController {
  constructor(private readonly regions: MacroRegionsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista las macrorregiones (M1…M8)' })
  findAll(@Query() query: CatalogQueryDto): Promise<MacroRegion[]> {
    return this.regions.findAll(query);
  }
}
