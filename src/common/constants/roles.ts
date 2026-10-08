/**
 * Único lugar donde se definen los nombres de los roles.
 * Solo ADMIN es fijo del sistema; el resto es PROVISIONAL hasta que el cliente lo confirme.
 */
export const ROLES = {
  ADMIN: 'ADMIN',
  REVISOR: 'REVISOR',
  IMPRESION: 'IMPRESION',
  ENTREGA: 'ENTREGA',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
