import { AuditChanges } from './entities/audit-log.entity';

/** Claves que nunca llegan a la auditoría (contraseñas, hashes, tokens). */
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'accessToken',
  'token',
  'verificationToken',
]);

/** Campos técnicos que no aportan al historial. */
const IGNORED_KEYS = new Set(['id', 'createdAt', 'updatedAt']);

type Plain = Record<string, unknown>;

const isTracked = (key: string) =>
  !SENSITIVE_KEYS.has(key) && !IGNORED_KEYS.has(key);

/** Normaliza para comparar y guardar: fechas a ISO, objetos tal cual (jsonb). */
const normalize = (value: unknown): unknown =>
  value instanceof Date ? value.toISOString() : (value ?? null);

const isRelation = (value: unknown) =>
  typeof value === 'object' &&
  value !== null &&
  !(value instanceof Date) &&
  'id' in value;

/** Cambios de un alta: todos los campos con old = null. */
export function creationChanges(entity: object): AuditChanges {
  const changes: AuditChanges = {};
  for (const [key, value] of Object.entries(entity as Plain)) {
    if (!isTracked(key) || isRelation(value) || value === undefined) continue;
    changes[key] = { old: null, new: normalize(value) };
  }
  return changes;
}

/** Solo los campos que realmente cambiaron entre `before` y `after`. */
export function diffChanges(before: object, after: object): AuditChanges {
  const changes: AuditChanges = {};
  const prev = before as Plain;
  for (const [key, value] of Object.entries(after as Plain)) {
    if (!isTracked(key) || isRelation(value) || value === undefined) continue;
    const oldValue = normalize(prev[key]);
    const newValue = normalize(value);
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[key] = { old: oldValue, new: newValue };
    }
  }
  return changes;
}
