import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, QueryDeepPartialEntity } from 'typeorm';
import { AuditActor } from '../../audit/audit-actor';
import { creationChanges } from '../../audit/audit-changes';
import { AuditLog } from '../../audit/entities/audit-log.entity';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { MacroRegion } from '../../catalogs/macro-regions/entities/macro-region.entity';
import { ParticipantType } from '../../catalogs/participant-types/entities/participant-type.entity';
import { Sport } from '../../catalogs/sports/entities/sport.entity';
import { Delegation } from '../../delegations/entities/delegation.entity';
import { EligibilityService } from '../../eligibility/eligibility.service';
import { Participant } from '../entities/participant.entity';
import { ParticipantStatus } from '../enums';
import { readParticipantRows } from './excel-reader';
import { ImportPreviewDto, ImportResultDto } from './import.dto';
import { ImportCatalogs, ParsedParticipant, parseRow } from './import-mapping';

const MAX_ERRORS_SHOWN = 500;
const CHUNK = 500;

interface Analysis {
  sheet: string;
  totalRows: number;
  valid: { row: number; data: ParsedParticipant }[];
  errors: { row: number; errors: string[] }[];
  existing: Set<string>;
  existingDelegations: Map<string, string>;
}

const docKey = (
  p: Pick<ParsedParticipant, 'documentType' | 'documentNumber'>,
) => `${p.documentType}:${p.documentNumber}`;

/** Fila a insertar. Cast: TypeORM no tipa bien jsonb (extraData) en insert(). */
const toParticipantRow = (
  data: ParsedParticipant,
  delegationId: string,
  status: ParticipantStatus,
) =>
  ({
    documentType: data.documentType,
    documentNumber: data.documentNumber,
    firstNames: data.firstNames,
    paternalLastName: data.paternalLastName,
    maternalLastName: data.maternalLastName,
    gender: data.gender,
    birthDate: data.birthDate,
    participantTypeId: data.participantTypeId,
    delegationId,
    schoolName: data.schoolName,
    schoolModularCode: data.schoolModularCode,
    ugel: data.ugel,
    region: data.region,
    province: data.province,
    district: data.district,
    phone: data.phone,
    email: data.email,
    disabilityType: data.disabilityType,
    disabilityClass: data.disabilityClass,
    externalId: data.externalId,
    externalDelegateId: data.externalDelegateId,
    extraData: data.extraData,
    status,
  }) as QueryDeepPartialEntity<Participant>;

/**
 * Importación del padrón (hoja LISTA LIMPIA del cliente) en dos pasos:
 * vista previa sin guardar y confirmación en una sola transacción.
 * USUARIO y PASSWORD nunca se leen. Los ya registrados se omiten (no se sobrescriben).
 */
@Injectable()
export class ParticipantImportService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly eligibility: EligibilityService,
  ) {}

  async preview(
    file: Express.Multer.File | undefined,
  ): Promise<ImportPreviewDto> {
    const a = await this.analyze(file);
    const toCreate = a.valid.filter((v) => !a.existing.has(docKey(v.data)));
    const byType: Record<string, number> = {};
    for (const { data } of toCreate) {
      byType[data.participantTypeCode] =
        (byType[data.participantTypeCode] ?? 0) + 1;
    }
    return {
      sheet: a.sheet,
      totalRows: a.totalRows,
      validRows: a.valid.length,
      invalidRows: a.errors.length,
      toCreate: toCreate.length,
      alreadyRegistered: a.valid.length - toCreate.length,
      newDelegations: this.newDelegationCodes(a),
      byType,
      errors: a.errors.slice(0, MAX_ERRORS_SHOWN),
    };
  }

  async commit(
    file: Express.Multer.File | undefined,
    fileName: string,
    actor: AuditActor,
  ): Promise<ImportResultDto> {
    const a = await this.analyze(file);
    if (a.errors.length) {
      throw new BadRequestException([
        `El Excel tiene ${a.errors.length} filas con errores: no se importó nada. Corríjalas y vuelva a intentar.`,
        ...a.errors
          .slice(0, 50)
          .map((e) => `Fila ${e.row}: ${e.errors.join(' ')}`),
      ]);
    }
    const rows = a.valid.filter((v) => !a.existing.has(docKey(v.data)));

    return this.dataSource.transaction(async (manager) => {
      const delegationIds = await this.createDelegations(manager, a, actor);
      const statusByType = await this.initialStatuses(manager, rows);
      const audits: AuditLog[] = [];
      const auditRepo = manager.getRepository(AuditLog);

      for (let i = 0; i < rows.length; i += CHUNK) {
        const values = rows
          .slice(i, i + CHUNK)
          .map(({ data }) =>
            toParticipantRow(
              data,
              delegationIds.get(data.delegation!.code)!,
              statusByType.get(data.participantTypeId)!,
            ),
          );
        const inserted = await manager
          .createQueryBuilder()
          .insert()
          .into(Participant)
          .values(values)
          .returning(['id'])
          .execute();
        inserted.identifiers.forEach((identifier, index) => {
          const id = String(identifier.id);
          audits.push(
            auditRepo.create({
              ...actor,
              action: AuditAction.IMPORT,
              entity: 'Participant',
              entityId: id,
              participantId: id,
              changes: creationChanges(values[index]),
            }),
          );
        });
      }

      audits.push(
        auditRepo.create({
          ...actor,
          action: AuditAction.IMPORT,
          entity: 'ParticipantImport',
          entityId: null,
          changes: {
            file: { old: null, new: fileName },
            created: { old: null, new: rows.length },
            skippedExisting: { old: null, new: a.valid.length - rows.length },
          },
        }),
      );
      await auditRepo.save(audits, { chunk: CHUNK });

      return {
        created: rows.length,
        skippedExisting: a.valid.length - rows.length,
        delegationsCreated: this.newDelegationCodes(a),
      };
    });
  }

  // ── Análisis (sin escribir) ──────────────────────────────────────

  private async analyze(
    file: Express.Multer.File | undefined,
  ): Promise<Analysis> {
    const { sheet, rows } = await readParticipantRows(file);
    const catalogs = await this.catalogs();

    const valid: Analysis['valid'] = [];
    const errors: Analysis['errors'] = [];
    const firstRowByDoc = new Map<string, number>();
    for (const raw of rows) {
      const result = parseRow(raw, catalogs);
      if (!result.ok) {
        errors.push({ row: result.row, errors: result.errors });
        continue;
      }
      const key = docKey(result.data);
      const first = firstRowByDoc.get(key);
      if (first) {
        errors.push({
          row: result.row,
          errors: [`Documento repetido: ya aparece en la fila ${first}.`],
        });
        continue;
      }
      firstRowByDoc.set(key, result.row);
      valid.push({ row: result.row, data: result.data });
    }

    const numbers = [...new Set(valid.map((v) => v.data.documentNumber))];
    const existing = new Set<string>();
    for (let i = 0; i < numbers.length; i += CHUNK) {
      const found = await this.dataSource.getRepository(Participant).find({
        select: { documentType: true, documentNumber: true },
        where: { documentNumber: In(numbers.slice(i, i + CHUNK)) },
      });
      found.forEach((p) => existing.add(docKey(p)));
    }

    const codes = [...new Set(valid.map((v) => v.data.delegation!.code))];
    const delegations = codes.length
      ? await this.dataSource
          .getRepository(Delegation)
          .findBy({ code: In(codes) })
      : [];

    return {
      sheet,
      totalRows: rows.length,
      valid,
      errors: errors.sort((x, y) => x.row - y.row),
      existing,
      existingDelegations: new Map(delegations.map((d) => [d.code, d.id])),
    };
  }

  private async catalogs(): Promise<ImportCatalogs> {
    const byCode = <T extends { code: string; id: string }>(items: T[]) =>
      new Map(items.map((i) => [i.code, i.id]));
    const [macros, sports, types] = await Promise.all([
      this.dataSource.getRepository(MacroRegion).findBy({ isActive: true }),
      this.dataSource.getRepository(Sport).findBy({ isActive: true }),
      this.dataSource.getRepository(ParticipantType).findBy({ isActive: true }),
    ]);
    return {
      macroRegions: byCode(macros),
      sports: byCode(sports),
      participantTypes: byCode(types),
    };
  }

  private newDelegationCodes(a: Analysis): string[] {
    const codes = new Set(
      a.valid
        .filter((v) => !a.existing.has(docKey(v.data)))
        .map((v) => v.data.delegation!.code)
        .filter((code) => !a.existingDelegations.has(code)),
    );
    return [...codes].sort();
  }

  // ── Escritura (dentro de la transacción) ─────────────────────────

  /** Crea las delegaciones que faltan (auditadas) y devuelve código → id. */
  private async createDelegations(
    manager: EntityManager,
    a: Analysis,
    actor: AuditActor,
  ): Promise<Map<string, string>> {
    const ids = new Map(a.existingDelegations);
    const repo = manager.getRepository(Delegation);
    const audits = manager.getRepository(AuditLog);
    for (const { data } of a.valid) {
      const d = data.delegation!;
      if (ids.has(d.code)) continue;
      const created = await repo.save(repo.create({ ...d }));
      ids.set(d.code, created.id);
      await audits.save(
        audits.create({
          ...actor,
          action: AuditAction.IMPORT,
          entity: 'Delegation',
          entityId: created.id,
          changes: creationChanges(created),
        }),
      );
    }
    return ids;
  }

  /** Estado inicial por tipo según sus requisitos (motor de reglas). */
  private async initialStatuses(
    manager: EntityManager,
    rows: { data: ParsedParticipant }[],
  ): Promise<Map<string, ParticipantStatus>> {
    const typeIds = [...new Set(rows.map((r) => r.data.participantTypeId))];
    const types = typeIds.length
      ? await manager.getRepository(ParticipantType).findBy({ id: In(typeIds) })
      : [];
    const statuses = new Map<string, ParticipantStatus>();
    for (const type of types) {
      statuses.set(
        type.id,
        await this.eligibility.initialStatus(manager, type),
      );
    }
    return statuses;
  }
}
