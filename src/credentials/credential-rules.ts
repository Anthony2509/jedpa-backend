import { BadRequestException, ConflictException } from '@nestjs/common';
import { MAX_DUPLICATES } from './entities/credential-copy.entity';

/** Nombre del ejemplar para pantallas, PDF y reportes. */
export const copyLabel = (copyNumber: number): string =>
  copyNumber === 0 ? 'Original' : `Duplicado ${copyNumber}`;

/**
 * Siguiente ejemplar a emitir (0 = original). Concurrencia optimista: debe coincidir
 * con el que espera el cliente (un doble clic no emite dos). Un duplicado exige motivo
 * y no se superan los 3 duplicados acordados con el cliente.
 */
export function nextCopyNumber(
  issued: number,
  expected: number,
  reason: string | null,
): number {
  if (issued > MAX_DUPLICATES) {
    throw new ConflictException(
      `Se alcanzó el máximo de ${MAX_DUPLICATES} duplicados para este participante.`,
    );
  }
  if (expected !== issued) {
    throw new ConflictException(
      `El siguiente ejemplar a emitir es ${copyLabel(issued)} (se solicitó ${copyLabel(expected)}). Actualice la pantalla.`,
    );
  }
  if (issued > 0 && !reason) {
    throw new BadRequestException(
      'Indique el motivo del duplicado (pérdida, deterioro, error de impresión...).',
    );
  }
  return issued;
}
