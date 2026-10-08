/**
 * Único lugar donde se definen los nombres de los roles (confirmados por el cliente).
 * Matriz de permisos: docs/SPEC.md §2.
 */
export const ROLES = {
  ADMIN: 'ADMIN',
  COORDINATOR: 'COORDINADOR',
  OPERATOR: 'OPERADOR',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
