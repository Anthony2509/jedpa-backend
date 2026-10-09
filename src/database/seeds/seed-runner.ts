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
import { ROLES } from '../../common/constants/roles';
import { BCRYPT_ROUNDS } from '../../common/constants/security';
import { Role } from '../../roles/entities/role.entity';
import { PASSWORD_RULES } from '../../users/dto/create-user.dto';
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

/** Crea un usuario (si no existe) y audita el alta como acción del sistema. */
async function createUserIfMissing(
  manager: EntityManager,
  log: Log,
  seed: { email: string; fullName: string; role: string; password: string },
): Promise<void> {
  const users = manager.getRepository(User);
  if (await users.existsBy({ email: seed.email })) {
    log(`Usuario ${seed.email}: ya existe, no se modifica.`);
    return;
  }
  const role = await manager
    .getRepository(Role)
    .findOneByOrFail({ name: seed.role });
  const user = await users.save(
    users.create({
      email: seed.email,
      fullName: seed.fullName,
      roleId: role.id,
      passwordHash: await bcrypt.hash(seed.password, BCRYPT_ROUNDS),
    }),
  );
  const auditLogs = manager.getRepository(AuditLog);
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

/**
 * Producción: un único ADMIN inicial con SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD,
 * solo si aún no existe ningún ADMIN. Nunca usuarios de desarrollo.
 */
async function seedProductionAdmin(manager: EntityManager, log: Log) {
  const adminRole = await manager
    .getRepository(Role)
    .findOneByOrFail({ name: ROLES.ADMIN });
  if (await manager.getRepository(User).existsBy({ roleId: adminRole.id })) {
    log('Administrador: ya existe al menos uno, no se crea otro.');
    return;
  }
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'No hay administrador: defina SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD para crear el primero.',
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('SEED_ADMIN_EMAIL no es un correo válido.');
  }
  if (
    password.length < PASSWORD_RULES.min ||
    !PASSWORD_RULES.pattern.test(password)
  ) {
    throw new Error(
      'SEED_ADMIN_PASSWORD debe tener al menos 12 caracteres, con letras y números.',
    );
  }
  await createUserIfMissing(manager, log, {
    email,
    fullName: 'Administrador',
    role: ROLES.ADMIN,
    password,
  });
}

/**
 * Desarrollo y pruebas: un usuario por rol con contraseña común (DEV_USER_PASSWORD).
 * Producción: solo el ADMIN inicial.
 */
async function seedUsers(manager: EntityManager, log: Log): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    await seedProductionAdmin(manager, log);
    return;
  }
  for (const seed of DEV_USER_SEEDS) {
    await createUserIfMissing(manager, log, {
      ...seed,
      password: DEV_USER_PASSWORD,
    });
  }
}

/** Carga roles, catálogos, requisitos y usuarios iniciales. Idempotente. */
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
    await seedUsers(manager, log);
  });
}
