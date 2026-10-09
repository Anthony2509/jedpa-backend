import { ParticipantTypeCategory } from '../catalogs/participant-types/entities/participant-type.entity';
import { DocumentStatus } from '../documents/enums/document-status.enum';
import { ParticipantStatus } from '../participants/enums';

/** Situación de un documento obligatorio para evaluar la habilitación. */
export interface RequiredDocumentState {
  status: DocumentStatus;
  hasFile: boolean;
}

/** Estados posteriores a la impresión: el motor documental no los modifica. */
const PRINT_PHASE = new Set<ParticipantStatus>([
  ParticipantStatus.PRINTED,
  ParticipantStatus.DELIVERED,
]);

export const isPrintPhase = (status: ParticipantStatus): boolean =>
  PRINT_PHASE.has(status);

const isSatisfied = (doc: RequiredDocumentState) =>
  doc.status === DocumentStatus.APPROVED ||
  doc.status === DocumentStatus.NOT_APPLICABLE;

/**
 * Situación documental (función pura). Prioridad:
 * OBSERVED > PENDING_DOCUMENTS > IN_REVIEW > READY_TO_PRINT.
 * Los especiales y los tipos sin requisitos quedan listos para imprimir.
 */
export function evaluateDocuments(
  category: ParticipantTypeCategory,
  required: RequiredDocumentState[],
): ParticipantStatus {
  if (category === ParticipantTypeCategory.SPECIAL) {
    return ParticipantStatus.READY_TO_PRINT;
  }
  if (required.some((d) => d.status === DocumentStatus.OBSERVED)) {
    return ParticipantStatus.OBSERVED;
  }
  if (required.some((d) => !isSatisfied(d) && !d.hasFile)) {
    return ParticipantStatus.PENDING_DOCUMENTS;
  }
  if (required.some((d) => !isSatisfied(d))) {
    return ParticipantStatus.IN_REVIEW;
  }
  return ParticipantStatus.READY_TO_PRINT;
}

/**
 * Estado del flujo: una vez impresa o entregada, la credencial existe físicamente
 * y los cambios documentales ya no retroceden el estado.
 */
export const nextStatus = (
  current: ParticipantStatus,
  documentStatus: ParticipantStatus,
): ParticipantStatus => (isPrintPhase(current) ? current : documentStatus);

/** Se imprime (original o duplicado) solo si la situación documental lo permite. */
export const canPrint = (documentStatus: ParticipantStatus): boolean =>
  documentStatus === ParticipantStatus.READY_TO_PRINT;
