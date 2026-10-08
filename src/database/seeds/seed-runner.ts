import * as bcrypt from 'bcrypt';
import {
  DataSource,
  EntityManager,
  EntityTarget,
  ObjectLiteral,
} from 'typeorm';
import { AuditLog } from '../../audit/entities/audit-log.entity';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { DocumentRequirement } from '../../catalogs/document-types/entities/document-requirement.entity';
import { DocumentType } from '../../catalogs/document-types/entities/document-type.entity';
import { DeliveryPlace } from '../../catalogs/delivery-places/entities/delivery-place.entity';
import { MacroRegion } from '../../catalogs/macro-regions/entities/macro-region.entity';
import { ParticipantType } from '../../catalogs/participant-types/entities/participant-type.entity';
import { Sport } from '../../catalogs/sports/entities/sport.entity';
import { BCRYPT_ROUNDS } from '../../common/constants/security';
import { Role } from '../../roles/entities/role.entity';
import { User } from '../../users/entities/user.entity';
import {
  DELIVERY_PLACE_SEEDS,
  DEV_USER_PASSWORD,
  DEV_USER_SEEDS,
  DOCUMENT_REQUIREMENT_SEEDS,
  DOCUMENT_TYPE_SEEDS,
  MACRO_REGION_SEEDS,
  PARTICIPANT_TYPE_SEEDS,
  ROLE_SEEDS,
  SPORT_SEEDS,
} from './seed-data';

type Log = (...args: unknown[]) => void;

/** Inserta solo lo que no existe: nunca sobrescribe ediciones hechas por ADMIN. */
async function insertMissing<T extends ObjectLiteral>(
  manager: EntityManager,
  entity: EntityTarget<T>,
  rows: Partial<T>[],
): Promise<number> {
  const result = await manager
    .createQueryBuilder()
    .insert()
    .into(entity)
    .values(rows)
    .orIgnore()
    .execute();
  return result.identifiers.filter(Boolean).length;
}

async function seedRequirements(manager: EntityManager): Promise<number> {
  const types = await manager.getRepository(ParticipantType).find();
  const docs = await manager.getRepository(DocumentType).find();
  const typeId = new Map(types.map((t) => [t.code, t.id]));
  const docId = new Map(docs.map((d) => [d.code, d.id]));

  const rows = Object.entries(DOCUMENT_REQUIREMENT_SEEDS).flatMap(
    ([typeCode, docCodes]) =>
      docCodes.map((docCode) => ({
        participantTypeId: typeId.get(typeCode),
        documentTypeId: docId.get(docCode),
        isRequired: true,
      })),
  );
  return insertMissing(manager, DocumentRequirement, rows);
}

/**
 * Un usuario por rol con contraseña común, SOLO para desarrollo y pruebas.
 * Los existentes no se modifican. Cada alta queda auditada como acción del sistema.
 */
async function seedDevUsers(manager: EntityManager, log: Log): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    log('Usuarios de desarrollo: omitidos (NODE_ENV=production).');
    return;
  }

  const users = manager.getRepository(User);
  const auditLogs = manager.getRepository(AuditLog);
  const roles = await manager.getRepository(Role).find();
  const roleId = new Map(roles.map((r) => [r.name, r.id]));
  const passwordHash = await bcrypt.hash(DEV_USER_PASSWORD, BCRYPT_ROUNDS);

  for (const seed of DEV_USER_SEEDS) {
    if (await users.existsBy({ email: seed.email })) {
      log(`Usuario ${seed.email}: ya existe, no se modifica.`);
      continue;
    }
    const user = await users.save(
      users.create({
        email: seed.email,
        fullName: seed.fullName,
        roleId: roleId.get(seed.role),
        passwordHash,
      }),
    );
    await auditLogs.save(
      auditLogs.create({
        userId: null,
        action: AuditAction.CREATE,
        entity: 'User',
        entityId: user.id,
        changes: {
          email: { old: null, new: user.email },
          roleId: { old: null, new: user.roleId },
        },
      }),
    );
    log(`Usuario ${seed.email} (${seed.role}): creado.`);
  }
}

/** Carga roles, catálogos, requisitos y los usuarios de desarrollo. Idempotente. */
export async function runSeed(
  dataSource: DataSource,
  log: Log = console.log,
): Promise<void> {
  await dataSource.transaction(async (manager) => {
    const counts = {
      roles: await insertMissing(manager, Role, ROLE_SEEDS),
      tiposParticipante: await insertMissing(
        manager,
        ParticipantType,
        PARTICIPANT_TYPE_SEEDS,
      ),
      tiposDocumento: await insertMissing(
        manager,
        DocumentType,
        DOCUMENT_TYPE_SEEDS,
      ),
      macrorregiones: await insertMissing(
        manager,
        MacroRegion,
        MACRO_REGION_SEEDS,
      ),
      disciplinas: await insertMissing(manager, Sport, SPORT_SEEDS),
      lugaresEntrega: await insertMissing(
        manager,
        DeliveryPlace,
        DELIVERY_PLACE_SEEDS,
      ),
    };
    const requisitos = await seedRequirements(manager);
    log('Registros nuevos:', { ...counts, requisitos });
    await seedDevUsers(manager, log);
  });
}
