import { BadRequestException, ConflictException } from '@nestjs/common';
import { copyLabel, nextCopyNumber } from './credential-rules';

describe('credential-rules', () => {
  it('nombra los ejemplares', () => {
    expect(copyLabel(0)).toBe('Original');
    expect(copyLabel(3)).toBe('Duplicado 3');
  });

  it('emite el original sin motivo', () => {
    expect(nextCopyNumber(0, 0, null)).toBe(0);
  });

  it('un duplicado exige motivo', () => {
    expect(() => nextCopyNumber(1, 1, null)).toThrow(BadRequestException);
    expect(nextCopyNumber(1, 1, 'Pérdida')).toBe(1);
  });

  it('rechaza un doble clic (el ejemplar esperado ya se emitió)', () => {
    expect(() => nextCopyNumber(1, 0, null)).toThrow(ConflictException);
  });

  it('no permite más de 3 duplicados', () => {
    expect(nextCopyNumber(3, 3, 'Deterioro')).toBe(3);
    expect(() => nextCopyNumber(4, 4, 'Otra vez')).toThrow(
      'máximo de 3 duplicados',
    );
  });
});
