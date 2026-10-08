import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import {
  buildPaginatedResponse,
  PaginatedResponse,
} from '../common/pagination';
import { endOfPeruDay, startOfPeruDay } from '../common/constants/timezone';
import { User } from '../users/entities/user.entity';
import { AuditActor } from './audit-actor';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';
import { AuditChanges, AuditLog } from './entities/audit-log.entity';
import { AuditAction } from './enums/audit-action.enum';

export interface AuditEntry {
  action: AuditAction;
  entity: string;
  entityId: string | null;
  participantId?: string | null;
  changes?: AuditChanges | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  /**
   * Registra una acción. Recibe el EntityManager de la transacción del caso de uso:
   * si la operación falla, tampoco queda el registro (y viceversa).
   */
  async record(
    manager: EntityManager,
    actor: AuditActor,
    entry: AuditEntry,
  ): Promise<void> {
    const repo = manager.getRepository(AuditLog);
    await repo.save(
      repo.create({
        userId: actor.userId,
        ip: actor.ip,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        participantId: entry.participantId ?? null,
        changes: entry.changes ?? null,
      }),
    );
  }

  async findAll(
    query: AuditLogQueryDto,
  ): Promise<PaginatedResponse<AuditLogResponseDto>> {
    const qb = this.logs
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.limit);

    if (query.participantId) {
      qb.andWhere('log.participantId = :participantId', query);
    }
    if (query.userId) qb.andWhere('log.userId = :userId', query);
    if (query.action) qb.andWhere('log.action = :action', query);
    if (query.entity) qb.andWhere('log.entity = :entity', query);
    if (query.entityId) qb.andWhere('log.entityId = :entityId', query);
    if (query.from) {
      qb.andWhere('log.createdAt >= :from', {
        from: startOfPeruDay(query.from),
      });
    }
    if (query.to) {
      qb.andWhere('log.createdAt <= :to', { to: endOfPeruDay(query.to) });
    }

    const [logs, total] = await qb.getManyAndCount();
    const usersById = await this.loadUsers(logs);

    const data = logs.map((log) => ({
      ...log,
      user: log.userId ? (usersById.get(log.userId) ?? null) : null,
    }));
    return buildPaginatedResponse(data, total, query);
  }

  private async loadUsers(logs: AuditLog[]) {
    const ids = [...new Set(logs.map((l) => l.userId).filter(Boolean))];
    const users = ids.length
      ? await this.users.find({
          where: { id: In(ids as string[]) },
          select: { id: true, fullName: true, email: true },
        })
      : [];
    return new Map(
      users.map((u) => [
        u.id,
        { id: u.id, fullName: u.fullName, email: u.email },
      ]),
    );
  }
}
