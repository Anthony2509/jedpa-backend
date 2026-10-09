import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import { AuditActor } from '../audit/audit-actor';
import { creationChanges, diffChanges } from '../audit/audit-changes';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { MacroRegionsService } from '../catalogs/macro-regions/macro-regions.service';
import { SportsService } from '../catalogs/sports/sports.service';
import {
  buildPaginatedResponse,
  PaginatedResponse,
} from '../common/pagination';
import { escapeLike } from '../common/utils/text';
import { buildDelegationCode } from './delegation-code';
import { CreateDelegationDto } from './dto/create-delegation.dto';
import { DelegationQueryDto } from './dto/delegation-query.dto';
import { UpdateDelegationDto } from './dto/update-delegation.dto';
import { Delegation } from './entities/delegation.entity';

const ENTITY = 'Delegation';

@Injectable()
export class DelegationsService {
  constructor(
    @InjectRepository(Delegation)
    private readonly delegations: Repository<Delegation>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly macroRegions: MacroRegionsService,
    private readonly sports: SportsService,
    private readonly audit: AuditService,
  ) {}

  async findAll(
    query: DelegationQueryDto,
  ): Promise<PaginatedResponse<Delegation>> {
    const qb = this.delegations
      .createQueryBuilder('delegation')
      .innerJoinAndSelect('delegation.macroRegion', 'macroRegion')
      .innerJoinAndSelect('delegation.sport', 'sport')
      .orderBy('delegation.code', 'ASC')
      .skip(query.skip)
      .take(query.limit);

    const { search, macroRegionId, sportId, category, gender, isActive } =
      query;
    if (search) {
      qb.andWhere('delegation.code LIKE :search', {
        search: `%${escapeLike(search)}%`,
      });
    }
    if (macroRegionId) {
      qb.andWhere('delegation.macroRegionId = :macroRegionId', {
        macroRegionId,
      });
    }
    if (sportId) qb.andWhere('delegation.sportId = :sportId', { sportId });
    if (category) {
      qb.andWhere('delegation.category = :category', { category });
    }
    if (gender) qb.andWhere('delegation.gender = :gender', { gender });
    if (isActive !== undefined) {
      qb.andWhere('delegation.isActive = :isActive', { isActive });
    }

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResponse(data, total, query);
  }

  findOne(id: string): Promise<Delegation> {
    return this.getOrFail(this.delegations.manager, id);
  }

  /** Delegación existente y activa, o 400: se usa al asignarla a un participante. */
  async getActiveOrFail(id: string): Promise<Delegation> {
    const delegation = await this.delegations.findOneBy({
      id,
      isActive: true,
    });
    if (!delegation) {
      throw new BadRequestException(
        'La delegación no existe o está desactivada.',
      );
    }
    return delegation;
  }

  async create(
    dto: CreateDelegationDto,
    actor: AuditActor,
  ): Promise<Delegation> {
    const code = await this.resolveCode(dto);
    await this.assertCodeAvailable(code);

    const id = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Delegation);
      const delegation = await repo.save(repo.create({ ...dto, code }));
      await this.audit.record(manager, actor, {
        action: AuditAction.CREATE,
        entity: ENTITY,
        entityId: delegation.id,
        changes: creationChanges(delegation),
      });
      return delegation.id;
    });
    return this.findOne(id);
  }

  async update(
    id: string,
    dto: UpdateDelegationDto,
    actor: AuditActor,
  ): Promise<Delegation> {
    await this.dataSource.transaction(async (manager) => {
      const current = await this.getOrFail(manager, id);
      const next = {
        macroRegionId: dto.macroRegionId ?? current.macroRegionId,
        sportId: dto.sportId ?? current.sportId,
        category: dto.category ?? current.category,
        gender: dto.gender ?? current.gender,
      };
      const code = await this.resolveCode(next);
      if (code !== current.code) await this.assertCodeAvailable(code, id);

      const changes = diffChanges(current, { ...next, code });
      if (Object.keys(changes).length) {
        await manager.getRepository(Delegation).update(id, { ...next, code });
        await this.audit.record(manager, actor, {
          action: AuditAction.UPDATE,
          entity: ENTITY,
          entityId: id,
          changes,
        });
      }
    });
    return this.findOne(id);
  }

  async setActive(
    id: string,
    isActive: boolean,
    actor: AuditActor,
  ): Promise<Delegation> {
    await this.dataSource.transaction(async (manager) => {
      const delegation = await this.getOrFail(manager, id);
      if (delegation.isActive === isActive) return;
      await manager.getRepository(Delegation).update(id, { isActive });
      await this.audit.record(manager, actor, {
        action: isActive ? AuditAction.ACTIVATE : AuditAction.DEACTIVATE,
        entity: ENTITY,
        entityId: id,
        changes: { isActive: { old: delegation.isActive, new: isActive } },
      });
    });
    return this.findOne(id);
  }

  private async resolveCode(parts: CreateDelegationDto): Promise<string> {
    const [macro, sport] = await Promise.all([
      this.macroRegions.getActiveOrFail(parts.macroRegionId),
      this.sports.getActiveOrFail(parts.sportId),
    ]);
    return buildDelegationCode({
      macroCode: macro.code,
      sportCode: sport.code,
      category: parts.category,
      gender: parts.gender,
    });
  }

  private async assertCodeAvailable(code: string, exceptId?: string) {
    const taken = await this.delegations.existsBy({
      code,
      ...(exceptId && { id: Not(exceptId) }),
    });
    if (taken) {
      throw new ConflictException(`Ya existe la delegación ${code}.`);
    }
  }

  private async getOrFail(
    manager: EntityManager,
    id: string,
  ): Promise<Delegation> {
    const delegation = await manager.getRepository(Delegation).findOne({
      where: { id },
      relations: { macroRegion: true, sport: true },
    });
    if (!delegation) throw new NotFoundException('Delegación no encontrada.');
    return delegation;
  }
}
