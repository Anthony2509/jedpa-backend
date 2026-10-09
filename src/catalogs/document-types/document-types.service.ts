import { Injectable, NotFoundException } from '@nestjs/common';
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

  /** Tipo de documento activo por código (p. ej. FOTO), o 404. */
  async getActiveByCode(code: string): Promise<DocumentType> {
    const type = await this.types.findOneBy({
      code: code.toUpperCase(),
      isActive: true,
    });
    if (!type) {
      throw new NotFoundException(`No existe el tipo de documento ${code}.`);
    }
    return type;
  }

  /** IDs de los documentos obligatorios para un tipo de participante. */
  async requiredDocumentTypeIds(
    participantTypeId: string,
  ): Promise<Set<string>> {
    const requirements = await this.requirements.findBy({
      participantTypeId,
      isRequired: true,
    });
    return new Set(requirements.map((r) => r.documentTypeId));
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
