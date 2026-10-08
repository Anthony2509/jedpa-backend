import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogQueryDto } from '../../common/dto/catalog-query.dto';
import { Sport } from './entities/sport.entity';

@Injectable()
export class SportsService {
  constructor(
    @InjectRepository(Sport) private readonly sports: Repository<Sport>,
  ) {}

  findAll({ includeInactive }: CatalogQueryDto): Promise<Sport[]> {
    return this.sports.find({
      where: includeInactive ? {} : { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async getActiveOrFail(id: string): Promise<Sport> {
    const sport = await this.sports.findOneBy({ id, isActive: true });
    if (!sport) {
      throw new BadRequestException(
        'La disciplina no existe o está desactivada.',
      );
    }
    return sport;
  }
}
