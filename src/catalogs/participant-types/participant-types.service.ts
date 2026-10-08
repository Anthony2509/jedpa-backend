import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogQueryDto } from '../../common/dto/catalog-query.dto';
import { ParticipantType } from './entities/participant-type.entity';

@Injectable()
export class ParticipantTypesService {
  constructor(
    @InjectRepository(ParticipantType)
    private readonly types: Repository<ParticipantType>,
  ) {}

  findAll({ includeInactive }: CatalogQueryDto): Promise<ParticipantType[]> {
    return this.types.find({
      where: includeInactive ? {} : { isActive: true },
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  /** Tipo existente y activo, o 400: se usa al asignarlo a un participante. */
  async getActiveOrFail(id: string): Promise<ParticipantType> {
    const type = await this.types.findOneBy({ id, isActive: true });
    if (!type) {
      throw new BadRequestException(
        'El tipo de participante no existe o está desactivado.',
      );
    }
    return type;
  }
}
