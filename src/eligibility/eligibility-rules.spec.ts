import { ParticipantTypeCategory } from '../catalogs/participant-types/entities/participant-type.entity';
import { DocumentStatus } from '../documents/enums/document-status.enum';
import { ParticipantStatus } from '../participants/enums';
import {
  canPrint,
  evaluateDocuments,
  nextStatus,
  RequiredDocumentState,
} from './eligibility-rules';

const { REGULAR, SPECIAL } = ParticipantTypeCategory;
const { PENDING, APPROVED, OBSERVED, NOT_APPLICABLE } = DocumentStatus;
const doc = (
  status: DocumentStatus,
  hasFile = true,
): RequiredDocumentState => ({
  status,
  hasFile,
});

describe('eligibility-rules', () => {
  describe('evaluateDocuments', () => {
    it.each<[string, RequiredDocumentState[], ParticipantStatus]>([
      [
        'sin archivos',
        [doc(PENDING, false), doc(PENDING, false)],
        ParticipantStatus.PENDING_DOCUMENTS,
      ],
      [
        'falta uno, otro en revisión',
        [doc(PENDING, false), doc(PENDING)],
        ParticipantStatus.PENDING_DOCUMENTS,
      ],
      [
        'todos subidos, alguno sin revisar',
        [doc(APPROVED), doc(PENDING)],
        ParticipantStatus.IN_REVIEW,
      ],
      [
        'alguno observado (prioridad)',
        [doc(PENDING, false), doc(OBSERVED)],
        ParticipantStatus.OBSERVED,
      ],
      [
        'todos aprobados',
        [doc(APPROVED), doc(APPROVED)],
        ParticipantStatus.READY_TO_PRINT,
      ],
      [
        'aprobado + no aplica',
        [doc(APPROVED), doc(NOT_APPLICABLE, false)],
        ParticipantStatus.READY_TO_PRINT,
      ],
      ['tipo sin requisitos', [], ParticipantStatus.READY_TO_PRINT],
    ])('regular: %s', (_case, required, expected) => {
      expect(evaluateDocuments(REGULAR, required)).toBe(expected);
    });

    it('los especiales siempre están listos para imprimir', () => {
      expect(evaluateDocuments(SPECIAL, [doc(OBSERVED)])).toBe(
        ParticipantStatus.READY_TO_PRINT,
      );
    });
  });

  it('impresa y entregada no retroceden por cambios documentales', () => {
    expect(
      nextStatus(ParticipantStatus.PRINTED, ParticipantStatus.OBSERVED),
    ).toBe(ParticipantStatus.PRINTED);
    expect(
      nextStatus(ParticipantStatus.DELIVERED, ParticipantStatus.IN_REVIEW),
    ).toBe(ParticipantStatus.DELIVERED);
    expect(
      nextStatus(ParticipantStatus.IN_REVIEW, ParticipantStatus.READY_TO_PRINT),
    ).toBe(ParticipantStatus.READY_TO_PRINT);
  });

  it('solo se imprime con la situación documental en regla', () => {
    expect(canPrint(ParticipantStatus.READY_TO_PRINT)).toBe(true);
    expect(canPrint(ParticipantStatus.OBSERVED)).toBe(false);
    expect(canPrint(ParticipantStatus.PENDING_DOCUMENTS)).toBe(false);
  });
});
