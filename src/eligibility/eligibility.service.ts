import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AuditActor } from '../audit/audit-actor';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { DocumentRequirement } from '../catalogs/document-types/entities/document-requirement.entity';
import { ParticipantType } from '../catalogs/participant-types/entities/participant-type.entity';
import { ParticipantDocument } from '../documents/entities/participant-document.entity';
import { DocumentStatus } from '../documents/enums/document-status.enum';
import { Participant } from '../participants/entities/participant.entity';
import { ParticipantStatus } from '../participants/enums';
import { findParticipantOrFail } from '../participants/find-participant';
import { canPrint, evaluateDocuments, nextStatus } from './eligibility-rules';

export interface Eligibility {
  /** Situación según los documentos (ignora la fase de impresión). */
  documentStatus: ParticipantStatus;
  /** Estado del flujo que corresponde al participante. */
  status: ParticipantStatus;
  canPrint: boolean;
}

/**
 * Motor de reglas: compara los documentos del participante con los requisitos de su
 * tipo (tabla document_requirements) y fija el estado. Siempre dentro de la
 * transacción del caso de uso que lo invoca.
 */
@Injectable()
export class EligibilityService {
  constructor(private readonly audit: AuditService) {}

  /** Estado inicial de un alta (sin documentos todavía). */
  async initialStatus(
    manager: EntityManager,
    type: ParticipantType,
  ): Promise<ParticipantStatus> {
    const requirements = await this.requirementsOf(manager, type.id);
    return evaluateDocuments(
      type.category,
      requirements.map(() => ({
        status: DocumentStatus.PENDING,
        hasFile: false,
      })),
    );
  }

  async evaluate(
    manager: EntityManager,
    participantId: string,
  ): Promise<Eligibility & { participant: Participant }> {
    const participant = await findParticipantOrFail(manager, participantId);

    const [requirements, documents] = await Promise.all([
      this.requirementsOf(manager, participant.participantTypeId),
      manager
        .getRepository(ParticipantDocument)
        .findBy({ participantId: participant.id }),
    ]);
    const byType = new Map(documents.map((d) => [d.documentTypeId, d]));
    const documentStatus = evaluateDocuments(
      participant.participantType.category,
      requirements.map((r) => {
        const doc = byType.get(r.documentTypeId);
        return {
          status: doc?.status ?? DocumentStatus.PENDING,
          hasFile: Boolean(doc?.fileId),
        };
      }),
    );
    return {
      participant,
      documentStatus,
      status: nextStatus(participant.status, documentStatus),
      canPrint: canPrint(documentStatus),
    };
  }

  /** Recalcula y guarda el estado; si cambia, lo audita como STATUS_CHANGE. */
  async recalculate(
    manager: EntityManager,
    participantId: string,
    actor: AuditActor,
  ): Promise<Eligibility> {
    const { participant, ...eligibility } = await this.evaluate(
      manager,
      participantId,
    );
    if (eligibility.status !== participant.status) {
      await manager
        .getRepository(Participant)
        .update(participant.id, { status: eligibility.status });
      await this.audit.record(manager, actor, {
        action: AuditAction.STATUS_CHANGE,
        entity: 'Participant',
        entityId: participant.id,
        participantId: participant.id,
        changes: {
          status: { old: participant.status, new: eligibility.status },
        },
      });
    }
    return eligibility;
  }

  private requirementsOf(manager: EntityManager, participantTypeId: string) {
    return manager
      .getRepository(DocumentRequirement)
      .findBy({ participantTypeId, isRequired: true });
  }
}
