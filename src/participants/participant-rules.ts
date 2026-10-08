import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ParticipantTypeCategory } from '../catalogs/participant-types/entities/participant-type.entity';
import { RoleName, ROLES } from '../common/constants/roles';
import {
  Gender,
  IDENTITY_DOCUMENT_PATTERNS,
  IdentityDocumentType,
  ParticipantStatus,
} from './enums';

/** Reglas de negocio del participante, sin dependencias de infraestructura. */

const DOCUMENT_FORMAT_MESSAGES: Record<IdentityDocumentType, string> = {
  [IdentityDocumentType.DNI]: 'El DNI debe tener exactamente 8 dígitos.',
  [IdentityDocumentType.CE]:
    'El carné de extranjería debe tener entre 6 y 12 caracteres alfanuméricos.',
  [IdentityDocumentType.PASAPORTE]:
    'El pasaporte debe tener entre 6 y 12 caracteres alfanuméricos.',
};

export function assertValidDocumentNumber(
  type: IdentityDocumentType,
  number: string,
): void {
  if (!IDENTITY_DOCUMENT_PATTERNS[type].test(number)) {
    throw new BadRequestException(DOCUMENT_FORMAT_MESSAGES[type]);
  }
}

/** Los especiales no requieren documentos: nacen listos para imprimir. */
export const initialStatusFor = (
  category: ParticipantTypeCategory,
): ParticipantStatus =>
  category === ParticipantTypeCategory.SPECIAL
    ? ParticipantStatus.READY_TO_PRINT
    : ParticipantStatus.PENDING_DOCUMENTS;

/** Credenciales especiales (MINEDU, Invitado, Proveedores): solo ADMIN y COORDINADOR. */
const SPECIAL_MANAGERS: RoleName[] = [ROLES.ADMIN, ROLES.COORDINATOR];

export function assertCanManageCategory(
  role: RoleName,
  category: ParticipantTypeCategory,
): void {
  if (
    category === ParticipantTypeCategory.SPECIAL &&
    !SPECIAL_MANAGERS.includes(role)
  ) {
    throw new ForbiddenException(
      'Solo Administrador o Coordinador gestionan credenciales especiales.',
    );
  }
}

export interface ParticipantComposition {
  category: ParticipantTypeCategory;
  delegationId: string | null;
  institution: string | null;
  gender: Gender | null;
  birthDate: string | null;
}

/** Campos obligatorios según la categoría del tipo de participante. */
export function assertValidComposition(p: ParticipantComposition): void {
  const errors: string[] = [];
  if (p.category === ParticipantTypeCategory.REGULAR) {
    if (!p.delegationId) errors.push('La delegación es obligatoria.');
    if (!p.gender) errors.push('El género es obligatorio.');
    if (!p.birthDate) errors.push('La fecha de nacimiento es obligatoria.');
  } else {
    if (p.delegationId) {
      errors.push(
        'Las credenciales especiales no pertenecen a una delegación.',
      );
    }
    if (!p.institution) {
      errors.push('La institución o servicio es obligatoria.');
    }
  }
  if (errors.length) throw new BadRequestException(errors);
}

/** Estados con credencial ya impresa: el tipo deja de poder cambiarse. */
export const hasPrintedCredential = (status: ParticipantStatus): boolean =>
  status === ParticipantStatus.PRINTED ||
  status === ParticipantStatus.DELIVERED;
