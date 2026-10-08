import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogQueryDto } from '../../common/dto/catalog-query.dto';
import { MacroRegion } from './entities/macro-region.entity';

@Injectable()
export class MacroRegionsService {
  constructor(
    @InjectRepository(MacroRegion)
    private readonly regions: Repository<MacroRegion>,
  ) {}

  findAll({ includeInactive }: CatalogQueryDto): Promise<MacroRegion[]> {
    return this.regions.find({
      where: includeInactive ? {} : { isActive: true },
      order: { code: 'ASC' },
    });
  }

  async getActiveOrFail(id: string): Promise<MacroRegion> {
    const region = await this.regions.findOneBy({ id, isActive: true });
    if (!region) {
      throw new BadRequestException(
        'La macrorregión no existe o está desactivada.',
      );
    }
    return region;
  }
}
