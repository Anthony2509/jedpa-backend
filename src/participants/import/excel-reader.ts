import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';

/** Clave de encabezado normalizada: mayúsculas, sin tildes ni espacios repetidos. */
export const normalizeHeader = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

/** Columnas que NUNCA se leen: credenciales de otro sistema (ver SPEC §11). */
export const FORBIDDEN_COLUMNS = new Set(['USUARIO', 'PASSWORD']);

/** Encabezado que identifica la fila de títulos (y la hoja correcta). */
const ANCHOR = 'DOCUMENTO DE IDENTIDAD';
const MAX_HEADER_SCAN = 20;
export const MAX_IMPORT_ROWS = 5000;

export interface RawRow {
  /** Número de fila en el Excel, para los mensajes de error. */
  row: number;
  values: Record<string, string>;
}

const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];

/** Texto visible de una celda (resuelve fórmulas, texto enriquecido y fechas). */
function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value && typeof value === 'object' && 'result' in value) {
    // Resultado de fórmula: fecha, texto, número o booleano; un error de fórmula → vacío.
    const result: unknown = value.result;
    if (result instanceof Date) return result.toISOString().slice(0, 10);
    return ['string', 'number', 'boolean'].includes(typeof result)
      ? String(result).trim()
      : '';
  }
  return (cell.text ?? '').trim();
}

/**
 * Lee la hoja que contiene la columna "DOCUMENTO DE IDENTIDAD" (p. ej. LISTA LIMPIA)
 * y devuelve las filas con datos, indexadas por encabezado normalizado.
 */
export async function readParticipantRows(
  file: Express.Multer.File | undefined,
): Promise<{ sheet: string; rows: RawRow[] }> {
  if (!file?.buffer?.length) {
    throw new BadRequestException('Debe adjuntar el Excel en el campo "file".');
  }
  if (!ZIP_SIGNATURE.every((byte, i) => file.buffer[i] === byte)) {
    throw new BadRequestException('El archivo debe ser un Excel .xlsx.');
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(file.buffer as unknown as ArrayBuffer);
  } catch {
    throw new BadRequestException(
      'No se pudo leer el Excel: archivo dañado o no es .xlsx.',
    );
  }

  for (const sheet of workbook.worksheets) {
    for (let r = 1; r <= Math.min(MAX_HEADER_SCAN, sheet.rowCount); r++) {
      // Encabezados repetidos se numeran: "GENERO" (delegación) y "GENERO_2" (persona).
      const headers = new Map<number, string>();
      const seen = new Map<string, number>();
      sheet.getRow(r).eachCell((cell, col) => {
        const header = normalizeHeader(cellText(cell));
        if (!header || FORBIDDEN_COLUMNS.has(header)) return;
        const count = (seen.get(header) ?? 0) + 1;
        seen.set(header, count);
        headers.set(col, count === 1 ? header : `${header}_${count}`);
      });
      if (![...headers.values()].includes(ANCHOR)) continue;

      const rows: RawRow[] = [];
      for (let i = r + 1; i <= sheet.rowCount; i++) {
        const values: Record<string, string> = {};
        const excelRow = sheet.getRow(i);
        for (const [col, header] of headers) {
          values[header] = cellText(excelRow.getCell(col));
        }
        if (!values[ANCHOR]) continue; // filas vacías o de totales
        rows.push({ row: i, values });
        if (rows.length > MAX_IMPORT_ROWS) {
          throw new BadRequestException(
            `El Excel supera el máximo de ${MAX_IMPORT_ROWS} filas por importación.`,
          );
        }
      }
      return { sheet: sheet.name, rows };
    }
  }
  throw new BadRequestException(
    `No se encontró una hoja con la columna "${ANCHOR}" en las primeras ${MAX_HEADER_SCAN} filas.`,
  );
}
