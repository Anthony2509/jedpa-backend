import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogQueryDto } from '../../common/dto/catalog-query.dto';
import { DocumentTypesService } from './document-types.service';
import { DocumentRequirementQueryDto } from './dto/document-requirement-query.dto';
import { DocumentRequirement } from './entities/document-requirement.entity';
import { DocumentType } from './entities/document-type.entity';

@ApiTags('Catálogos: documentos')
@Controller()
export class DocumentTypesController {
  constructor(private readonly documents: DocumentTypesService) {}

  @Get('document-types')
  @ApiOperation({ summary: 'Lista los tipos de documento' })
  findAll(@Query() query: CatalogQueryDto): Promise<DocumentType[]> {
    return this.documents.findAll(query);
  }

  @Get('document-requirements')
  @ApiOperation({
    summary: 'Documentos obligatorios por tipo de participante',
  })
  findRequirements(
    @Query() query: DocumentRequirementQueryDto,
  ): Promise<DocumentRequirement[]> {
    return this.documents.findRequirements(query);
  }
}
