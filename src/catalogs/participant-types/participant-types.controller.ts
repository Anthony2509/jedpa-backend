import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogQueryDto } from '../../common/dto/catalog-query.dto';
import { ParticipantType } from './entities/participant-type.entity';
import { ParticipantTypesService } from './participant-types.service';

@ApiTags('Catálogos: tipos de participante')
@Controller('participant-types')
export class ParticipantTypesController {
  constructor(private readonly types: ParticipantTypesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista los tipos de participante (REGULAR o SPECIAL)',
  })
  findAll(@Query() query: CatalogQueryDto): Promise<ParticipantType[]> {
    return this.types.findAll(query);
  }
}
