import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { AuditActor } from '../audit/audit-actor';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { DocumentType } from '../catalogs/document-types/entities/document-type.entity';
import { ParticipantDocument } from '../documents/entities/participant-document.entity';
import { DocumentStatus } from '../documents/enums/document-status.enum';
import { IdentityDocumentType } from '../participants/enums';
import { assertCanManageCategory } from '../participants/participant-rules';
import { StorageService } from '../storage/storage.service';
import { copyLabel } from './credential-rules';
import { CredentialsService } from './credentials.service';
import { CredentialCopy } from './entities/credential-copy.entity';
import {
  CredentialPrintData,
  renderCredentials,
} from './pdf/credential-pdf.renderer';

const DOCUMENT_PREFIX: Record<IdentityDocumentType, string> = {
  [IdentityDocumentType.DNI]: 'DNI',
  [IdentityDocumentType.CE]: 'CE',
  [IdentityDocumentType.PASAPORTE]: 'PAS',
};

/** Genera el PDF imprimible (120 × 155 mm) de uno o varios ejemplares ya emitidos. */
@Injectable()
export class CredentialPdfService {
  private readonly logger = new Logger(CredentialPdfService.name);
  private readonly offsetXmm: number;
  private readonly offsetYmm: number;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly storage: StorageService,
    private readonly credentials: CredentialsService,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.offsetXmm = config.getOrThrow<number>('CREDENTIAL_OFFSET_X_MM');
    this.offsetYmm = config.getOrThrow<number>('CREDENTIAL_OFFSET_Y_MM');
  }

  /**
   * PDF de ejemplares vigentes. Volver a descargar el mismo ejemplar (p. ej. por un
   * atasco de papel) no crea un duplicado; queda auditado como FILE_ACCESS.
   */
  async render(
    copyIds: string[],
    user: AuthUser,
    actor: AuditActor,
  ): Promise<Buffer> {
    const copies = await this.dataSource.getRepository(CredentialCopy).find({
      where: { id: In(copyIds) },
      relations: {
        participant: { participantType: true, delegation: true },
      },
    });
    const missing = copyIds.filter((id) => !copies.some((c) => c.id === id));
    if (missing.length) {
      throw new NotFoundException(
        `Ejemplares inexistentes: ${missing.join(', ')}.`,
      );
    }
    const revoked = copies.filter((c) => c.isRevoked);
    if (revoked.length) {
      throw new ConflictException(
        'Hay ejemplares reemplazados por un duplicado; imprima solo los vigentes.',
      );
    }
    for (const copy of copies) {
      assertCanManageCategory(
        user.role,
        copy.participant.participantType.category,
      );
    }

    const photos = await this.photosOf(copies.map((c) => c.participantId));
    // Mismo orden que la selección del usuario.
    const ordered = copyIds.map((id) => copies.find((c) => c.id === id)!);
    const pdf = await renderCredentials(
      ordered.map((copy) =>
        this.printData(copy, photos.get(copy.participantId) ?? null),
      ),
      { offsetXmm: this.offsetXmm, offsetYmm: this.offsetYmm },
    );

    for (const copy of ordered) {
      await this.audit.record(this.dataSource.manager, actor, {
        action: AuditAction.FILE_ACCESS,
        entity: 'CredentialCopy',
        entityId: copy.id,
        participantId: copy.participantId,
        changes: { pdf: { old: null, new: copyLabel(copy.copyNumber) } },
      });
    }
    return pdf;
  }

  /** Hoja de prueba con guías y datos ficticios, para calibrar en papel común. */
  testSheet(): Promise<Buffer> {
    return renderCredentials(
      [
        {
          fullName: 'NOMBRES APELLIDO PATERNO MATERNO',
          document: 'DNI 00000000',
          institution: 'M1-AJD-B-D · INSTITUCIÓN EDUCATIVA DE PRUEBA',
          copyLabel: 'Hoja de prueba',
          verificationUrl: `${this.credentials.verifyBaseUrl}/hoja-de-prueba`,
          photo: null,
        },
      ],
      { offsetXmm: this.offsetXmm, offsetYmm: this.offsetYmm, guides: true },
    );
  }

  private printData(
    copy: CredentialCopy,
    photo: Buffer | null,
  ): CredentialPrintData {
    const p = copy.participant;
    return {
      fullName: [p.firstNames, p.paternalLastName, p.maternalLastName]
        .filter(Boolean)
        .join(' ')
        .toUpperCase(),
      document: `${DOCUMENT_PREFIX[p.documentType]} ${p.documentNumber}`,
      institution: (p.delegation
        ? [p.delegation.code, p.schoolName].filter(Boolean).join(' · ')
        : (p.institution ?? '')
      ).toUpperCase(),
      copyLabel: copyLabel(copy.copyNumber),
      verificationUrl: `${this.credentials.verifyBaseUrl}/${copy.verificationToken}`,
      photo,
    };
  }

  /** Foto de cada participante (si no está observada). Un fallo no detiene el lote. */
  private async photosOf(
    participantIds: string[],
  ): Promise<Map<string, Buffer>> {
    const photoType = await this.dataSource
      .getRepository(DocumentType)
      .findOneBy({ code: 'FOTO' });
    const photos = new Map<string, Buffer>();
    if (!photoType) return photos;

    const docs = await this.dataSource.getRepository(ParticipantDocument).find({
      where: {
        participantId: In(participantIds),
        documentTypeId: photoType.id,
      },
      relations: { file: true },
    });
    for (const doc of docs) {
      if (!doc.file || doc.status === DocumentStatus.OBSERVED) continue;
      try {
        photos.set(doc.participantId, await this.storage.read(doc.file));
      } catch (error) {
        this.logger.warn(
          `No se pudo leer la foto de un participante: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return photos;
  }
}
