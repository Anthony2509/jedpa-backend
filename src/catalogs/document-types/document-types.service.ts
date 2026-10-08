import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogQueryDto } from '../../common/dto/catalog-query.dto';
import { DocumentRequirementQueryDto } from './dto/document-requirement-query.dto';
import { DocumentRequirement } from './entities/document-requirement.entity';
import { DocumentType } from './entities/document-type.entity';

@Injectable()
export class DocumentTypesService {
  constructor(
    @InjectRepository(DocumentType)
    private readonly types: Repository<DocumentType>,
    @InjectRepository(DocumentRequirement)
    private readonly requirements: Repository<DocumentRequirement>,
  ) {}

  findAll({ includeInactive }: CatalogQueryDto): Promise<DocumentType[]> {
    return this.types.find({
      where: includeInactive ? {} : { isActive: true },
      order: { name: 'ASC' },
    });
  }

  /** Requisitos documentales por tipo de participante (matriz del cliente). */
  findRequirements({
    participantTypeId,
  }: DocumentRequirementQueryDto): Promise<DocumentRequirement[]> {
    return this.requirements.find({
      where: participantTypeId ? { participantTypeId } : {},
      relations: { participantType: true, documentType: true },
      order: {
        participantType: { name: 'ASC' },
        documentType: { name: 'ASC' },
      },
    });
  }
}
