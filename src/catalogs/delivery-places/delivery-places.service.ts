import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuditActor } from '../../audit/audit-actor';
import { creationChanges, diffChanges } from '../../audit/audit-changes';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { CatalogQueryDto } from '../../common/dto/catalog-query.dto';
import { CreateDeliveryPlaceDto } from './dto/create-delivery-place.dto';
import { UpdateDeliveryPlaceDto } from './dto/update-delivery-place.dto';
import { DeliveryPlace } from './entities/delivery-place.entity';

const ENTITY = 'DeliveryPlace';

@Injectable()
export class DeliveryPlacesService {
  constructor(
    @InjectRepository(DeliveryPlace)
    private readonly places: Repository<DeliveryPlace>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  findAll({ includeInactive }: CatalogQueryDto): Promise<DeliveryPlace[]> {
    return this.places.find({
      where: includeInactive ? {} : { isActive: true },
      order: { name: 'ASC' },
    });
  }

  findOne(id: string): Promise<DeliveryPlace> {
    return this.getOrFail(this.places.manager, id);
  }

  /** Lugar existente y activo; lo usará el registro de entregas. */
  async getActiveOrFail(id: string): Promise<DeliveryPlace> {
    const place = await this.findOne(id);
    if (!place.isActive) {
      throw new ConflictException('El lugar de entrega está desactivado.');
    }
    return place;
  }

  async create(
    dto: CreateDeliveryPlaceDto,
    actor: AuditActor,
  ): Promise<DeliveryPlace> {
    await this.assertNameAvailable(dto.name);
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(DeliveryPlace);
      const place = await repo.save(repo.create({ name: dto.name }));
      await this.audit.record(manager, actor, {
        action: AuditAction.CREATE,
        entity: ENTITY,
        entityId: place.id,
        changes: creationChanges(place),
      });
      return place;
    });
  }

  async update(
    id: string,
    dto: UpdateDeliveryPlaceDto,
    actor: AuditActor,
  ): Promise<DeliveryPlace> {
    if (dto.name) await this.assertNameAvailable(dto.name, id);
    return this.dataSource.transaction(async (manager) => {
      const place = await this.getOrFail(manager, id);
      const changes = diffChanges(place, dto);
      if (Object.keys(changes).length) {
        await manager.getRepository(DeliveryPlace).update(id, dto);
        await this.audit.record(manager, actor, {
          action: AuditAction.UPDATE,
          entity: ENTITY,
          entityId: id,
          changes,
        });
      }
      return this.getOrFail(manager, id);
    });
  }

  async setActive(
    id: string,
    isActive: boolean,
    actor: AuditActor,
  ): Promise<DeliveryPlace> {
    return this.dataSource.transaction(async (manager) => {
      const place = await this.getOrFail(manager, id);
      if (place.isActive !== isActive) {
        await manager.getRepository(DeliveryPlace).update(id, { isActive });
        await this.audit.record(manager, actor, {
          action: isActive ? AuditAction.ACTIVATE : AuditAction.DEACTIVATE,
          entity: ENTITY,
          entityId: id,
          changes: { isActive: { old: place.isActive, new: isActive } },
        });
      }
      return this.getOrFail(manager, id);
    });
  }

  private async getOrFail(
    manager: EntityManager,
    id: string,
  ): Promise<DeliveryPlace> {
    const place = await manager.getRepository(DeliveryPlace).findOneBy({ id });
    if (!place) throw new NotFoundException('Lugar de entrega no encontrado.');
    return place;
  }

  /** Nombre único sin distinguir mayúsculas. */
  private async assertNameAvailable(name: string, exceptId?: string) {
    const qb = this.places
      .createQueryBuilder('place')
      .where('LOWER(place.name) = LOWER(:name)', { name });
    if (exceptId) qb.andWhere('place.id <> :exceptId', { exceptId });
    if (await qb.getExists()) {
      throw new ConflictException(
        'Ya existe un lugar de entrega con ese nombre.',
      );
    }
  }
}
