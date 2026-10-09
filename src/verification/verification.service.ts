import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { copyLabel } from '../credentials/credential-rules';
import { CredentialCopy } from '../credentials/entities/credential-copy.entity';
import { DocumentsService } from '../documents/documents.service';
import { Participant } from '../participants/entities/participant.entity';
import { VerificationDto } from './verification.dto';

const TOKEN_PATTERN = /^[\w-]{16,64}$/;

@Injectable()
export class VerificationService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly documents: DocumentsService,
  ) {}

  async verify(token: string): Promise<VerificationDto> {
    const copy = TOKEN_PATTERN.test(token)
      ? await this.dataSource
          .getRepository(CredentialCopy)
          .findOneBy({ verificationToken: token })
      : null;
    if (!copy) throw new NotFoundException('Credencial no encontrada.');

    const credential = copyLabel(copy.copyNumber);
    if (copy.isRevoked) {
      // Una credencial reemplazada (p. ej. perdida) no revela datos del participante.
      return {
        valid: false,
        enabled: false,
        message:
          'Credencial NO válida: fue reemplazada por un duplicado. Solicite la credencial vigente.',
        credential,
        participant: null,
        documents: [],
      };
    }

    const participant = await this.dataSource
      .getRepository(Participant)
      .findOneOrFail({
        where: { id: copy.participantId },
        relations: { participantType: true, delegation: true },
      });
    const checklist = await this.documents.checklist(participant.id);
    const enabled = participant.isActive && checklist.eligibility.canPrint;

    return {
      valid: true,
      enabled,
      message: !participant.isActive
        ? 'Credencial válida, pero el participante está desactivado.'
        : enabled
          ? 'Credencial válida. Participante habilitado.'
          : 'Credencial válida, pero la documentación tiene observaciones o pendientes.',
      credential,
      participant: {
        fullName: [
          participant.firstNames,
          participant.paternalLastName,
          participant.maternalLastName,
        ]
          .filter(Boolean)
          .join(' ')
          .toUpperCase(),
        participantType: participant.participantType.name,
        accessLevel: participant.participantType.accessLevel,
        delegation: participant.delegation?.code ?? null,
        institution: participant.delegation ? null : participant.institution,
      },
      documents: checklist.documents
        .filter((d) => d.required)
        .map((d) => ({ name: d.documentType.name, status: d.status })),
    };
  }
}
