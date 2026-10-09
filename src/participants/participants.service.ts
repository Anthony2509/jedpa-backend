import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Not,
  QueryDeepPartialEntity,
  Repository,
} from 'typeorm';
import { AuditActor } from '../audit/audit-actor';
import { creationChanges, diffChanges } from '../audit/audit-changes';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { ParticipantTypesService } from '../catalogs/participant-types/participant-types.service';
import {
  buildPaginatedResponse,
  PaginatedResponse,
} from '../common/pagination';
import { escapeLike } from '../common/utils/text';
import { DelegationsService } from '../delegations/delegations.service';
import { EligibilityService } from '../eligibility/eligibility.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { ParticipantQueryDto } from './dto/participant-query.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { Participant } from './entities/participant.entity';
import { IdentityDocumentType } from './enums';
import {
  assertCanManageCategory,
  assertValidComposition,
  assertValidDocumentNumber,
  hasPrintedCredential,
} from './participant-rules';

const ENTITY = 'Participant';
const MAX_SEARCH_TERMS = 5;
/** Campos de búsqueda sin distinguir tildes (extensión unaccent). */
const ACCENT_INSENSITIVE_FIELDS = [
  'firstNames',
  'paternalLastName',
  'maternalLastName',
  'schoolName',
] as const;

/** Campos obligatorios que una edición no puede vaciar con null. */
const NON_NULLABLE_FIELDS: (keyof UpdateParticipantDto)[] = [
  'documentType',
  'documentNumber',
  'firstNames',
  'paternalLastName',
  'participantTypeId',
];

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectRepository(Participant)
    private readonly participants: Repository<Participant>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly participantTypes: ParticipantTypesService,
    private readonly delegations: DelegationsService,
    private readonly audit: AuditService,
    private readonly eligibility: EligibilityService,
  ) {}

  async findAll(
    query: ParticipantQueryDto,
  ): Promise<PaginatedResponse<Participant>> {
    const qb = this.participants
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.participantType', 'participantType')
      .leftJoinAndSelect('p.delegation', 'delegation')
      .leftJoinAndSelect('delegation.macroRegion', 'macroRegion')
      .leftJoinAndSelect('delegation.sport', 'sport')
      .orderBy('p.paternalLastName', 'ASC')
      .addOrderBy('p.maternalLastName', 'ASC')
      .addOrderBy('p.firstNames', 'ASC')
      .skip(query.skip)
      .take(query.limit);

    // Cada palabra debe aparecer en el documento, nombres, apellidos o colegio.
    const terms = (query.search ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, MAX_SEARCH_TERMS);
    terms.forEach((term, i) => {
      const matchesTerm = [
        `p.documentNumber ILIKE :t${i}`,
        ...ACCENT_INSENSITIVE_FIELDS.map(
          (field) => `unaccent(p.${field}) ILIKE unaccent(:t${i})`,
        ),
      ];
      // Paréntesis obligatorios: los OR de un término se combinan con AND entre términos.
      qb.andWhere(`(${matchesTerm.join(' OR ')})`, {
        [`t${i}`]: `%${escapeLike(term)}%`,
      });
    });

    const { status, participantTypeId, delegationId, macroRegionId, isActive } =
      query;
    if (status) qb.andWhere('p.status = :status', { status });
    if (participantTypeId) {
      qb.andWhere('p.participantTypeId = :participantTypeId', {
        participantTypeId,
      });
    }
    if (delegationId) {
      qb.andWhere('p.delegationId = :delegationId', { delegationId });
    }
    if (macroRegionId) {
      qb.andWhere('delegation.macroRegionId = :macroRegionId', {
        macroRegionId,
      });
    }
    if (isActive !== undefined) {
      qb.andWhere('p.isActive = :isActive', { isActive });
    }

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResponse(data, total, query);
  }

  findOne(id: string): Promise<Participant> {
    return this.getOrFail(this.participants.manager, id);
  }

  async create(
    dto: CreateParticipantDto,
    user: AuthUser,
    actor: AuditActor,
  ): Promise<Participant> {
    const type = await this.participantTypes.getActiveOrFail(
      dto.participantTypeId,
    );
    assertCanManageCategory(user.role, type.category);
    assertValidDocumentNumber(dto.documentType, dto.documentNumber);
    assertValidComposition({
      category: type.category,
      delegationId: dto.delegationId ?? null,
      institution: dto.institution ?? null,
      gender: dto.gender ?? null,
      birthDate: dto.birthDate ?? null,
    });
    if (dto.delegationId) {
      await this.delegations.getActiveOrFail(dto.delegationId);
    }
    await this.assertDocumentAvailable(dto.documentType, dto.documentNumber);

    const id = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Participant);
      const participant = await repo.save(
        repo.create({
          ...dto,
          status: await this.eligibility.initialStatus(manager, type),
        }),
      );
      await this.audit.record(manager, actor, {
        action: AuditAction.CREATE,
        entity: ENTITY,
        entityId: participant.id,
        participantId: participant.id,
        changes: creationChanges(participant),
      });
      return participant.id;
    });
    return this.findOne(id);
  }

  async update(
    id: string,
    dto: UpdateParticipantDto,
    user: AuthUser,
    actor: AuditActor,
  ): Promise<Participant> {
    const cleared = NON_NULLABLE_FIELDS.filter((key) => dto[key] === null);
    if (cleared.length) {
      throw new BadRequestException(
        `Estos campos son obligatorios y no pueden quedar vacíos: ${cleared.join(', ')}.`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const current = await this.getOrFail(manager, id);
      assertCanManageCategory(user.role, current.participantType.category);

      // Tipo de participante y su categoría resultante.
      let type = current.participantType;
      if (
        dto.participantTypeId &&
        dto.participantTypeId !== current.participantTypeId
      ) {
        type = await this.participantTypes.getActiveOrFail(
          dto.participantTypeId,
        );
        assertCanManageCategory(user.role, type.category);
      }
      // La credencial impresa muestra el tipo: no puede cambiar después de imprimir.
      const typeChanged = type.id !== current.participantTypeId;
      if (typeChanged && hasPrintedCredential(current.status)) {
        throw new ConflictException(
          'No se puede cambiar el tipo de participante si la credencial ya fue impresa.',
        );
      }

      // Documento de identidad.
      const documentType = dto.documentType ?? current.documentType;
      const documentNumber = dto.documentNumber ?? current.documentNumber;
      if (
        documentType !== current.documentType ||
        documentNumber !== current.documentNumber
      ) {
        assertValidDocumentNumber(documentType, documentNumber);
        await this.assertDocumentAvailable(documentType, documentNumber, id);
      }

      // Delegación y campos obligatorios según la categoría.
      const pick = <K extends keyof UpdateParticipantDto & keyof Participant>(
        key: K,
      ) => (dto[key] !== undefined ? dto[key] : current[key]);
      const delegationId = pick('delegationId') ?? null;
      if (delegationId && delegationId !== current.delegationId) {
        await this.delegations.getActiveOrFail(delegationId);
      }
      assertValidComposition({
        category: type.category,
        delegationId,
        institution: pick('institution') ?? null,
        gender: pick('gender') ?? null,
        birthDate: pick('birthDate') ?? null,
      });

      const changes = { ...dto };
      const auditChanges = diffChanges(current, changes);
      if (!Object.keys(auditChanges).length) return;

      // Cast: TypeORM no tipa bien jsonb (extraData) en update().
      await manager
        .getRepository(Participant)
        .update(id, changes as QueryDeepPartialEntity<Participant>);
      await this.audit.record(manager, actor, {
        action: AuditAction.UPDATE,
        entity: ENTITY,
        entityId: id,
        participantId: id,
        changes: auditChanges,
      });
      // Otro tipo implica otros requisitos: el motor recalcula el estado.
      if (typeChanged) {
        await this.eligibility.recalculate(manager, id, actor);
      }
    });
    return this.findOne(id);
  }

  async setActive(
    id: string,
    isActive: boolean,
    actor: AuditActor,
  ): Promise<Participant> {
    await this.dataSource.transaction(async (manager) => {
      const participant = await this.getOrFail(manager, id);
      if (participant.isActive === isActive) return;
      await manager.getRepository(Participant).update(id, { isActive });
      await this.audit.record(manager, actor, {
        action: isActive ? AuditAction.ACTIVATE : AuditAction.DEACTIVATE,
        entity: ENTITY,
        entityId: id,
        participantId: id,
        changes: { isActive: { old: participant.isActive, new: isActive } },
      });
    });
    return this.findOne(id);
  }

  private async assertDocumentAvailable(
    documentType: IdentityDocumentType,
    documentNumber: string,
    exceptId?: string,
  ) {
    const taken = await this.participants.existsBy({
      documentType,
      documentNumber,
      ...(exceptId && { id: Not(exceptId) }),
    });
    if (taken) {
      throw new ConflictException(
        'Ya existe un participante registrado con ese documento.',
      );
    }
  }

  private async getOrFail(
    manager: EntityManager,
    id: string,
  ): Promise<Participant> {
    const participant = await manager.getRepository(Participant).findOne({
      where: { id },
      relations: {
        participantType: true,
        delegation: { macroRegion: true, sport: true },
      },
    });
    if (!participant) {
      throw new NotFoundException('Participante no encontrado.');
    }
    return participant;
  }
}
