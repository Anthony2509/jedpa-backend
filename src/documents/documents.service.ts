import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { AuditActor } from '../audit/audit-actor';
import { AuditChanges } from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { DocumentTypesService } from '../catalogs/document-types/document-types.service';
import { DocumentType } from '../catalogs/document-types/entities/document-type.entity';
import { MacroRegion } from '../catalogs/macro-regions/entities/macro-region.entity';
import { ROLES } from '../common/constants/roles';
import { EligibilityService } from '../eligibility/eligibility.service';
import { Participant } from '../participants/entities/participant.entity';
import { assertCanManageCategory } from '../participants/participant-rules';
import { StorageService } from '../storage/storage.service';
import { AllowedMimeType, SignedUrl } from '../storage/storage.types';
import { DocumentChecklistDto } from './dto/document-checklist.dto';
import { ReviewDocumentDto } from './dto/review-document.dto';
import { ParticipantDocument } from './entities/participant-document.entity';
import { DocumentStatus } from './enums/document-status.enum';

const ENTITY = 'ParticipantDocument';
export const RESOLUTION_CODE = 'RESOLUCION_DIRECTORAL';
const PHOTO_CODE = 'FOTO';
/** Vigencia máxima de enlaces a documentos con datos de salud (menores). */
export const SENSITIVE_URL_TTL_SECONDS = 60;

/** La foto se imprime en la credencial: solo imagen. El resto admite PDF o imagen. */
const allowedMimeTypes = (code: string): AllowedMimeType[] =>
  code === PHOTO_CODE
    ? ['image/jpeg', 'image/png']
    : ['application/pdf', 'image/jpeg', 'image/png'];

@Injectable()
export class DocumentsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly documentTypes: DocumentTypesService,
    private readonly storage: StorageService,
    private readonly eligibility: EligibilityService,
    private readonly audit: AuditService,
  ) {}

  // ── Ficha documental ─────────────────────────────────────────────

  async checklist(participantId: string): Promise<DocumentChecklistDto> {
    const manager = this.dataSource.manager;
    const participant = await this.getParticipant(manager, participantId);
    const [types, required, documents, eligibility] = await Promise.all([
      manager.getRepository(DocumentType).findBy({ isActive: true }),
      this.documentTypes.requiredDocumentTypeIds(participant.participantTypeId),
      manager.getRepository(ParticipantDocument).find({
        where: { participantId },
        relations: { file: true, reviewedBy: true },
      }),
      this.eligibility.evaluate(manager, participantId),
    ]);
    const byType = new Map(documents.map((d) => [d.documentTypeId, d]));

    const items = types.map((type) => {
      const doc = byType.get(type.id);
      return {
        id: doc?.id ?? null,
        documentType: {
          id: type.id,
          code: type.code,
          name: type.name,
          isSensitive: type.isSensitive,
        },
        required: required.has(type.id),
        status: doc?.status ?? DocumentStatus.PENDING,
        observation: doc?.observation ?? null,
        file: doc?.file
          ? {
              id: doc.file.id,
              originalName: doc.file.originalName,
              mimeType: doc.file.mimeType,
              sizeBytes: doc.file.sizeBytes,
              uploadedAt: doc.file.createdAt,
            }
          : null,
        reviewedBy: doc?.reviewedBy
          ? { id: doc.reviewedBy.id, fullName: doc.reviewedBy.fullName }
          : null,
        reviewedAt: doc?.reviewedAt ?? null,
      };
    });
    // Obligatorios primero; luego por nombre.
    items.sort(
      (a, b) =>
        Number(b.required) - Number(a.required) ||
        a.documentType.name.localeCompare(b.documentType.name, 'es'),
    );

    return {
      participantId,
      eligibility: {
        status: eligibility.status,
        documentStatus: eligibility.documentStatus,
        canPrint: eligibility.canPrint,
      },
      documents: items,
    };
  }

  // ── Subida y consulta ────────────────────────────────────────────

  /** Sube o reemplaza el archivo; el documento vuelve a PENDING para revisión. */
  async upload(
    participantId: string,
    code: string,
    file: Express.Multer.File | undefined,
    user: AuthUser,
    actor: AuditActor,
  ): Promise<DocumentChecklistDto> {
    const type = await this.documentTypes.getActiveByCode(code);
    await this.dataSource.transaction(async (manager) => {
      const participant = await this.getParticipant(manager, participantId);
      this.assertEditable(participant, user);

      const stored = await this.storage.store(
        manager,
        file,
        allowedMimeTypes(type.code),
        user.id,
      );
      await this.saveDocument(manager, actor, participant.id, type, {
        status: DocumentStatus.PENDING,
        fileId: stored.id,
        observation: null,
        reviewedById: null,
        reviewedAt: null,
      });
      await this.eligibility.recalculate(manager, participant.id, actor);
    });
    return this.checklist(participantId);
  }

  /**
   * Enlace temporal a un documento. Protección de datos de menores:
   * - cada emisión queda auditada (FILE_ACCESS), con quién y qué documento;
   * - los documentos con datos de salud caducan antes (SENSITIVE_URL_TTL_SECONDS);
   * - de un participante desactivado, solo ADMIN puede ver archivos.
   */
  async fileUrl(
    participantId: string,
    code: string,
    user: AuthUser,
    actor: AuditActor,
  ): Promise<SignedUrl> {
    const type = await this.documentTypes.getActiveByCode(code);
    const manager = this.dataSource.manager;
    const participant = await this.getParticipant(manager, participantId);
    if (!participant.isActive && user.role !== ROLES.ADMIN) {
      throw new ForbiddenException(
        'El participante está desactivado: solo Administrador puede ver sus archivos.',
      );
    }
    const doc = await manager.getRepository(ParticipantDocument).findOne({
      where: { participantId, documentTypeId: type.id },
      relations: { file: true },
    });
    if (!doc?.file) {
      throw new NotFoundException('El documento no tiene un archivo cargado.');
    }

    const url = await this.storage.accessUrl(
      doc.file,
      type.isSensitive ? SENSITIVE_URL_TTL_SECONDS : undefined,
    );
    await this.audit.record(manager, actor, {
      action: AuditAction.FILE_ACCESS,
      entity: ENTITY,
      entityId: doc.id,
      participantId,
      changes: { documentType: { old: type.code, new: type.code } },
    });
    return url;
  }

  // ── Revisión ─────────────────────────────────────────────────────

  /** Aprueba, observa, marca "no aplica" o devuelve a pendiente un documento. */
  async review(
    participantId: string,
    code: string,
    dto: ReviewDocumentDto,
    user: AuthUser,
    actor: AuditActor,
  ): Promise<DocumentChecklistDto> {
    const type = await this.documentTypes.getActiveByCode(code);
    const observation = dto.observation || null;
    if (dto.status === DocumentStatus.OBSERVED && !observation) {
      throw new BadRequestException(
        'Indique la observación: qué debe corregirse.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const participant = await this.getParticipant(manager, participantId);
      this.assertEditable(participant, user);

      const current = await manager
        .getRepository(ParticipantDocument)
        .findOneBy({ participantId, documentTypeId: type.id });
      if (dto.status === DocumentStatus.APPROVED && !current?.fileId) {
        throw new ConflictException(
          'No se puede aprobar un documento sin archivo cargado.',
        );
      }

      const reviewed = dto.status !== DocumentStatus.PENDING;
      await this.saveDocument(
        manager,
        actor,
        participantId,
        type,
        {
          status: dto.status,
          fileId: current?.fileId ?? null,
          observation,
          reviewedById: reviewed ? user.id : null,
          reviewedAt: reviewed ? new Date() : null,
        },
        AuditAction.DOCUMENT_REVIEW,
      );
      await this.eligibility.recalculate(manager, participantId, actor);
    });
    return this.checklist(participantId);
  }

  // ── Resolución Directoral por macrorregión ───────────────────────

  async uploadResolution(
    macroRegionId: string,
    file: Express.Multer.File | undefined,
    user: AuthUser,
    actor: AuditActor,
  ): Promise<MacroRegion> {
    return this.dataSource.transaction(async (manager) => {
      const region = await this.getMacroRegion(manager, macroRegionId);
      const stored = await this.storage.store(
        manager,
        file,
        ['application/pdf'],
        user.id,
      );
      await manager
        .getRepository(MacroRegion)
        .update(region.id, { resolutionFileId: stored.id });
      await this.audit.record(manager, actor, {
        action: AuditAction.UPDATE,
        entity: 'MacroRegion',
        entityId: region.id,
        changes: {
          resolutionFileId: { old: region.resolutionFileId, new: stored.id },
        },
      });
      return { ...region, resolutionFileId: stored.id };
    });
  }

  async resolutionUrl(
    macroRegionId: string,
    actor: AuditActor,
  ): Promise<SignedUrl> {
    const region = await this.dataSource.getRepository(MacroRegion).findOne({
      where: { id: macroRegionId },
      relations: { resolutionFile: true },
    });
    if (!region) throw new NotFoundException('Macrorregión no encontrada.');
    if (!region.resolutionFile) {
      throw new NotFoundException(
        'La macrorregión no tiene Resolución Directoral cargada.',
      );
    }
    const url = await this.storage.accessUrl(region.resolutionFile);
    await this.audit.record(this.dataSource.manager, actor, {
      action: AuditAction.FILE_ACCESS,
      entity: 'MacroRegion',
      entityId: region.id,
      changes: { documentType: { old: RESOLUTION_CODE, new: RESOLUTION_CODE } },
    });
    return url;
  }

  /**
   * Vincula la Resolución Directoral de la macrorregión a sus participantes.
   * Según el cliente, figurar en la resolución equivale a aprobar ese requisito.
   */
  async linkResolution(
    macroRegionId: string,
    participantIds: string[],
    user: AuthUser,
    actor: AuditActor,
  ): Promise<{ linked: number }> {
    const type = await this.documentTypes.getActiveByCode(RESOLUTION_CODE);
    await this.dataSource.transaction(async (manager) => {
      const region = await this.getMacroRegion(manager, macroRegionId);
      if (!region.resolutionFileId) {
        throw new ConflictException(
          'Primero cargue la Resolución Directoral de la macrorregión.',
        );
      }

      const participants = await manager.getRepository(Participant).find({
        where: { id: In(participantIds) },
        relations: { participantType: true, delegation: true },
      });
      const invalid = participantIds.filter((id) => {
        const p = participants.find((x) => x.id === id);
        return !p?.isActive || p.delegation?.macroRegionId !== region.id;
      });
      if (invalid.length) {
        throw new BadRequestException(
          `Estos participantes no existen, están desactivados o no pertenecen a la macrorregión ${region.code}: ${invalid.join(', ')}.`,
        );
      }

      for (const participant of participants) {
        this.assertEditable(participant, user);
        await this.saveDocument(manager, actor, participant.id, type, {
          status: DocumentStatus.APPROVED,
          fileId: region.resolutionFileId,
          observation: null,
          reviewedById: user.id,
          reviewedAt: new Date(),
        });
        await this.eligibility.recalculate(manager, participant.id, actor);
      }
    });
    return { linked: participantIds.length };
  }

  // ── Internos ─────────────────────────────────────────────────────

  /**
   * Crea o actualiza el documento de un participante y lo audita con los cambios
   * (archivo, estado, observación). Reutilizado por subida, vínculo y revisión.
   */
  async saveDocument(
    manager: EntityManager,
    actor: AuditActor,
    participantId: string,
    type: DocumentType,
    next: Pick<
      ParticipantDocument,
      'status' | 'fileId' | 'observation' | 'reviewedById' | 'reviewedAt'
    >,
    action?: AuditAction,
  ): Promise<ParticipantDocument> {
    const repo = manager.getRepository(ParticipantDocument);
    const current = await repo.findOneBy({
      participantId,
      documentTypeId: type.id,
    });
    const saved = await repo.save(
      current
        ? repo.merge(current, next)
        : repo.create({ participantId, documentTypeId: type.id, ...next }),
    );

    const changes: AuditChanges = {
      documentType: { old: type.code, new: type.code },
    };
    for (const key of ['status', 'fileId', 'observation'] as const) {
      const old = current?.[key] ?? null;
      if (old !== next[key]) changes[key] = { old, new: next[key] };
    }
    await this.audit.record(manager, actor, {
      action: action ?? (current ? AuditAction.UPDATE : AuditAction.CREATE),
      entity: ENTITY,
      entityId: saved.id,
      participantId,
      changes,
    });
    return saved;
  }

  async getParticipant(
    manager: EntityManager,
    id: string,
  ): Promise<Participant> {
    const participant = await manager.getRepository(Participant).findOne({
      where: { id },
      relations: { participantType: true },
    });
    if (!participant)
      throw new NotFoundException('Participante no encontrado.');
    return participant;
  }

  /** Participante activo y gestionable por el rol (especiales: ADMIN y COORDINADOR). */
  assertEditable(participant: Participant, user: AuthUser): void {
    if (!participant.isActive) {
      throw new ConflictException('El participante está desactivado.');
    }
    assertCanManageCategory(user.role, participant.participantType.category);
  }

  private async getMacroRegion(
    manager: EntityManager,
    id: string,
  ): Promise<MacroRegion> {
    const region = await manager.getRepository(MacroRegion).findOneBy({ id });
    if (!region) throw new NotFoundException('Macrorregión no encontrada.');
    return region;
  }
}
