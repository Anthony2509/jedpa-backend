import { TransformFnParams } from 'class-transformer';

/** Recorta espacios de un string (para @Transform en DTOs). */
export const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Recorta y pasa a minúsculas (correos). */
export const trimLower = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Recorta y pasa a mayúsculas (nombres y códigos). */
export const trimUpper = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

/** Escapa los comodines de LIKE/ILIKE en una búsqueda del usuario. */
export const escapeLike = (value: string): string =>
  value.replace(/[\\%_]/g, (c) => `\\${c}`);
