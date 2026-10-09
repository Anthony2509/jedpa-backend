import {
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { AuditActor } from '../audit/audit-actor';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { EligibilityService } from '../eligibility/eligibility.service';
import { Participant } from '../participants/entities/participant.entity';
import { ParticipantStatus } from '../participants/enums';
import { assertCanManageCategory } from '../participants/participant-rules';
import { copyLabel, nextCopyNumber } from './credential-rules';
import { BatchIssueResultDto } from './dto/batch.dto';
import { CredentialCopyDto } from './dto/credential-copy.dto';
import { IssueCredentialDto } from './dto/issue-credential.dto';
import { CredentialCopy } from './entities/credential-copy.entity';

const ENTITY = 'CredentialCopy';

@Injectable()
export class CredentialsService {
  readonly verifyBaseUrl: string;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly eligibility: EligibilityService,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.verifyBaseUrl =
      config.get<string>('VERIFY_PUBLIC_URL') ??
      `${config.getOrThrow<string>('FRONTEND_URL')}/verificar`;
  }

  async list(participantId: string): Promise<CredentialCopyDto[]> {
    await this.getParticipant(this.dataSource.manager, participantId);
    const copies = await this.dataSource.getRepository(CredentialCopy).find({
      where: { participantId },
      relations: { printedBy: true },
      order: { copyNumber: 'ASC' },
    });
    return copies.map((c) => CredentialCopyDto.from(c, this.verifyBaseUrl));
  }

  /**
   * Registra la impresión del siguiente ejemplar (original o duplicado).
   * - Solo si la situación documental lo permite (motor de reglas).
   * - Un duplicado exige motivo y revoca el QR de los ejemplares anteriores.
   * - Bloquea la fila del participante: dos clics simultáneos no generan dos ejemplares.
   * - El participante queda PRINTED; imprimir nunca marca la entrega.
   */
  async issue(
    participantId: string,
    dto: IssueCredentialDto,
    user: AuthUser,
    actor: AuditActor,
  ): Promise<CredentialCopyDto> {
    const id = await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Participant).findOne({
        where: { id: participantId },
        lock: { mode: 'pessimistic_write' },
      });
      const participant = await this.getParticipant(manager, participantId);
      if (!participant.isActive) {
        throw new ConflictException('El participante está desactivado.');
      }
      assertCanManageCategory(user.role, participant.participantType.category);

      const eligibility = await this.eligibility.evaluate(
        manager,
        participantId,
      );
      if (!eligibility.canPrint) {
        throw new ConflictException(
          `No se puede imprimir: el participante tiene requisitos sin cumplir (${eligibility.documentStatus}).`,
        );
      }

      const repo = manager.getRepository(CredentialCopy);
      const issued = await repo.countBy({ participantId });
      const reason = dto.reason || null;
      const copyNumber = nextCopyNumber(issued, dto.copyNumber, reason);

      if (copyNumber > 0) {
        await repo.update(
          { participantId, isRevoked: false },
          { isRevoked: true },
        );
      }
      const copy = await repo.save(
        repo.create({
          participantId,
          copyNumber,
          verificationToken: randomBytes(24).toString('base64url'),
          printedAt: new Date(),
          printedById: user.id,
          reason,
        }),
      );

      await this.audit.record(manager, actor, {
        action: copyNumber === 0 ? AuditAction.PRINT : AuditAction.REPRINT,
        entity: ENTITY,
        entityId: copy.id,
        participantId,
        changes: {
          copy: { old: null, new: copyLabel(copyNumber) },
          ...(reason && { reason: { old: null, new: reason } }),
        },
      });
      if (participant.status !== ParticipantStatus.PRINTED) {
        await manager
          .getRepository(Participant)
          .update(participantId, { status: ParticipantStatus.PRINTED });
        await this.audit.record(manager, actor, {
          action: AuditAction.STATUS_CHANGE,
          entity: 'Participant',
          entityId: participantId,
          participantId,
          changes: {
            status: { old: participant.status, new: ParticipantStatus.PRINTED },
          },
        });
      }
      return copy.id;
    });
    return this.findCopy(id);
  }

  /**
   * Emite el ORIGINAL de varios participantes. Cada uno va en su propia transacción:
   * los que no cumplen (requisitos, ya impresos, permisos) se informan sin frenar al resto.
   */
  async issueBatch(
    participantIds: string[],
    user: AuthUser,
    actor: AuditActor,
  ): Promise<BatchIssueResultDto> {
    const result: BatchIssueResultDto = { issued: [], skipped: [] };
    for (const participantId of participantIds) {
      try {
        const copy = await this.issue(
          participantId,
          { copyNumber: 0 },
          user,
          actor,
        );
        result.issued.push({ participantId, copyId: copy.id });
      } catch (error) {
        if (!(error instanceof HttpException)) throw error;
        const response = error.getResponse();
        const message =
          typeof response === 'object' && 'message' in response
            ? String(response.message)
            : error.message;
        result.skipped.push({ participantId, reason: message });
      }
    }
    return result;
  }

  /** Id del ejemplar de un participante por su número (0 = original). */
  async copyIdOf(participantId: string, copyNumber: number): Promise<string> {
    const copy = await this.dataSource
      .getRepository(CredentialCopy)
      .findOneBy({ participantId, copyNumber });
    if (!copy) throw new NotFoundException('Ese ejemplar no ha sido emitido.');
    return copy.id;
  }

  async findCopy(id: string): Promise<CredentialCopyDto> {
    const copy = await this.dataSource.getRepository(CredentialCopy).findOne({
      where: { id },
      relations: { printedBy: true },
    });
    if (!copy) throw new NotFoundException('Ejemplar no encontrado.');
    return CredentialCopyDto.from(copy, this.verifyBaseUrl);
  }

  private async getParticipant(
    manager: EntityManager,
    id: string,
  ): Promise<Participant> {
    const participant = await manager.getRepository(Participant).findOne({
      where: { id },
      relations: { participantType: true },
    });
    if (!participant)
      throw new NotFoundException('Participante no encontrado.');
    return participant;
  }
}
