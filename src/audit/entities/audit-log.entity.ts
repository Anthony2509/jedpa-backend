import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditAction } from '../enums/audit-action.enum';

/** Cambio de un campo: valor anterior y nuevo. */
export type AuditChanges = Record<string, { old: unknown; new: unknown }>;

/**
 * Registro de auditoría. SOLO INSERCIÓN: un trigger en la base de datos
 * rechaza UPDATE y DELETE. Nunca guarda contraseñas ni hashes.
 */
@Entity('audit_logs')
@Index(['entity', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** null cuando la acción la ejecuta el sistema (seed, procesos). */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'enum', enum: AuditAction, enumName: 'audit_action' })
  action: AuditAction;

  @Column({ length: 50 })
  entity: string;

  @Column({ type: 'uuid', nullable: true })
  entityId: string | null;

  /** Participante afectado, para filtrar el historial por participante. */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  participantId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  changes: AuditChanges | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
