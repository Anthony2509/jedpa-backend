/** Estados del flujo del participante. PRINTED y DELIVERED son distintos. */
export enum ParticipantStatus {
  PENDING_DOCUMENTS = 'PENDING_DOCUMENTS',
  IN_REVIEW = 'IN_REVIEW',
  OBSERVED = 'OBSERVED',
  READY_TO_PRINT = 'READY_TO_PRINT',
  PRINTED = 'PRINTED',
  DELIVERED = 'DELIVERED',
}
