import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ParticipantTypeCategory } from '../catalogs/participant-types/entities/participant-type.entity';
import { ROLES } from '../common/constants/roles';
import { Gender, IdentityDocumentType, ParticipantStatus } from './enums';
import {
  assertCanManageCategory,
  assertValidComposition,
  assertValidDocumentNumber,
  hasPrintedCredential,
  initialStatusFor,
} from './participant-rules';

const { REGULAR, SPECIAL } = ParticipantTypeCategory;

describe('participant-rules', () => {
  describe('assertValidDocumentNumber', () => {
    it.each([
      [IdentityDocumentType.DNI, '00007342'],
      [IdentityDocumentType.CE, '001234567'],
      [IdentityDocumentType.PASAPORTE, 'AB123456'],
    ])('acepta %s %s', (type, number) => {
      expect(() => assertValidDocumentNumber(type, number)).not.toThrow();
    });

    it.each([
      [IdentityDocumentType.DNI, '1234567'],
      [IdentityDocumentType.DNI, '1234567A'],
      [IdentityDocumentType.CE, '12-34'],
      [IdentityDocumentType.PASAPORTE, 'A'.repeat(13)],
    ])('rechaza %s %s', (type, number) => {
      expect(() => assertValidDocumentNumber(type, number)).toThrow(
        BadRequestException,
      );
    });
  });

  it('los especiales nacen listos para imprimir; los regulares, pendientes', () => {
    expect(initialStatusFor(SPECIAL)).toBe(ParticipantStatus.READY_TO_PRINT);
    expect(initialStatusFor(REGULAR)).toBe(ParticipantStatus.PENDING_DOCUMENTS);
  });

  it('el OPERADOR no gestiona credenciales especiales', () => {
    expect(() => assertCanManageCategory(ROLES.OPERATOR, SPECIAL)).toThrow(
      ForbiddenException,
    );
    expect(() =>
      assertCanManageCategory(ROLES.OPERATOR, REGULAR),
    ).not.toThrow();
    expect(() =>
      assertCanManageCategory(ROLES.COORDINATOR, SPECIAL),
    ).not.toThrow();
  });

  describe('assertValidComposition', () => {
    const regular = {
      category: REGULAR,
      delegationId: 'd1',
      institution: null,
      gender: Gender.FEMALE,
      birthDate: '2012-01-01',
    };

    it('acepta un regular completo', () => {
      expect(() => assertValidComposition(regular)).not.toThrow();
    });

    it('exige delegación, género y fecha de nacimiento a los regulares', () => {
      expect(() =>
        assertValidComposition({
          ...regular,
          delegationId: null,
          gender: null,
          birthDate: null,
        }),
      ).toThrow(BadRequestException);
    });

    it('exige institución y prohíbe delegación a los especiales', () => {
      expect(() =>
        assertValidComposition({ ...regular, category: SPECIAL }),
      ).toThrow(BadRequestException);
      expect(() =>
        assertValidComposition({
          category: SPECIAL,
          delegationId: null,
          institution: 'MINEDU',
          gender: null,
          birthDate: null,
        }),
      ).not.toThrow();
    });
  });

  it('impresa y entregada cuentan como credencial impresa', () => {
    expect(hasPrintedCredential(ParticipantStatus.PRINTED)).toBe(true);
    expect(hasPrintedCredential(ParticipantStatus.DELIVERED)).toBe(true);
    expect(hasPrintedCredential(ParticipantStatus.READY_TO_PRINT)).toBe(false);
  });
});
