import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { AppBaseEntity } from '../../database/base.entity';
import { Participant } from '../../participants/entities/participant.entity';
import { User } from '../../users/entities/user.entity';

export const MAX_DUPLICATES = 3;

/** Ejemplar impreso: 0 = original, 1..3 = duplicados. */
@Entity('credential_copies')
@Unique(['participantId', 'copyNumber'])
@Check(`"copy_number" BETWEEN 0 AND ${MAX_DUPLICATES}`)
export class CredentialCopy extends AppBaseEntity {
  @Index()
  @Column('uuid')
  participantId: string;

  @ManyToOne(() => Participant, { nullable: false })
  @JoinColumn()
  participant: Participant;

  @Column('smallint')
  copyNumber: number;

  /** Token aleatorio del QR; nunca contiene datos personales. */
  @Column({ length: 64, unique: true })
  verificationToken: string;

  @Column({ default: false })
  isRevoked: boolean;

  @Column({ type: 'timestamptz' })
  printedAt: Date;

  @Column('uuid')
  printedById: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn()
  printedBy: User;

  /** Motivo obligatorio para duplicados. */
  @Column({ type: 'text', nullable: true })
  reason: string | null;
}
