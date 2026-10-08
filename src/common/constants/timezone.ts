/** Perú no usa horario de verano: UTC-5 todo el año. */
export const PERU_UTC_OFFSET = '-05:00';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Inicio del día en hora de Perú si llega solo la fecha (YYYY-MM-DD). */
export const startOfPeruDay = (value: string): string =>
  DATE_ONLY.test(value) ? `${value}T00:00:00${PERU_UTC_OFFSET}` : value;

/** Fin del día en hora de Perú si llega solo la fecha (YYYY-MM-DD). */
export const endOfPeruDay = (value: string): string =>
  DATE_ONLY.test(value) ? `${value}T23:59:59.999${PERU_UTC_OFFSET}` : value;
