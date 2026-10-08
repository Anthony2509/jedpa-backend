import * as bcrypt from 'bcrypt';
import * as Joi from 'joi';
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
import { User } from '../../users/entities/user.entity';
import {
  DELIVERY_PLACE_SEEDS,
  DOCUMENT_REQUIREMENT_SEEDS,
  DOCUMENT_TYPE_SEEDS,
  MACRO_REGION_SEEDS,
  PARTICIPANT_TYPE_SEEDS,
  ROLE_SEEDS,
  SPORT_SEEDS,
} from './seed-data';

export interface SeedEnv {
  SEED_ADMIN_EMAIL: string;
  SEED_ADMIN_PASSWORD: string;
}

const seedEnvSchema = Joi.object<SeedEnv>({
  SEED_ADMIN_EMAIL: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),
  SEED_ADMIN_PASSWORD: Joi.string().min(12).required(),
});

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

async function seedAdmin(
  manager: EntityManager,
  email: string,
  password: string,
): Promise<string> {
  const users = manager.getRepository(User);
  if (await users.existsBy({ email })) {
    return 'Usuario administrador: ya existe, no se modifica.';
  }
  const role = await manager
    .getRepository(Role)
    .findOneByOrFail({ name: ROLES.ADMIN });
  const admin = await users.save(
    users.create({
      email,
      fullName: 'Administrador',
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      roleId: role.id,
    }),
  );
  const auditLogs = manager.getRepository(AuditLog);
  await auditLogs.save(
    auditLogs.create({
      userId: null,
      action: AuditAction.CREATE,
      entity: 'User',
      entityId: admin.id,
      changes: {
        email: { old: null, new: email },
        roleId: { old: null, new: role.id },
      },
    }),
  );
  return 'Usuario administrador: creado.';
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

/** Valida SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD; lanza un error claro si faltan. */
export function validateSeedEnv(env: NodeJS.ProcessEnv): SeedEnv {
  const result = seedEnvSchema.validate(env, {
    allowUnknown: true,
    abortEarly: false,
  });
  if (result.error) {
    throw new Error(
      `Variables del seed inválidas: ${result.error.message}. Defínalas en .env (ver .env.example).`,
    );
  }
  return result.value;
}

/** Carga roles, catálogos, requisitos y el ADMIN inicial. Idempotente. */
export async function runSeed(
  dataSource: DataSource,
  env: SeedEnv,
  log: (...args: unknown[]) => void = console.log,
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
    log(
      await seedAdmin(
        manager,
        env.SEED_ADMIN_EMAIL.toLowerCase(),
        env.SEED_ADMIN_PASSWORD,
      ),
    );
  });
}
