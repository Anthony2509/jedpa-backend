import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogQueryDto } from '../../common/dto/catalog-query.dto';
import { Sport } from './entities/sport.entity';
import { SportsService } from './sports.service';

@ApiTags('Catálogos: disciplinas')
@Controller('sports')
export class SportsController {
  constructor(private readonly sports: SportsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista las disciplinas deportivas y su abreviatura',
  })
  findAll(@Query() query: CatalogQueryDto): Promise<Sport[]> {
    return this.sports.findAll(query);
  }
}
