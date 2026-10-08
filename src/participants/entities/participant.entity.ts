import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { ParticipantType } from '../../catalogs/participant-types/entities/participant-type.entity';
import { AppBaseEntity } from '../../database/base.entity';
import { Delegation } from '../../delegations/entities/delegation.entity';
import { Gender, IdentityDocumentType, ParticipantStatus } from '../enums';

@Entity('participants')
@Unique(['documentType', 'documentNumber'])
export class Participant extends AppBaseEntity {
  @Column({
    type: 'enum',
    enum: IdentityDocumentType,
    enumName: 'identity_document_type',
  })
  documentType: IdentityDocumentType;

  /** Texto: conserva ceros a la izquierda. */
  @Column({ length: 20 })
  documentNumber: string;

  @Column({ length: 100 })
  firstNames: string;

  @Column({ length: 100 })
  paternalLastName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  maternalLastName: string | null;

  @Column({ type: 'enum', enum: Gender, enumName: 'gender', nullable: true })
  gender: Gender | null;

  @Column({ type: 'date', nullable: true })
  birthDate: string | null;

  @Index()
  @Column('uuid')
  participantTypeId: string;

  @ManyToOne(() => ParticipantType, { nullable: false })
  @JoinColumn()
  participantType: ParticipantType;

  /** Obligatoria para tipos regulares; null para especiales. */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  delegationId: string | null;

  @ManyToOne(() => Delegation, { nullable: true })
  @JoinColumn()
  delegation: Delegation | null;

  /** "Servicio / Institución" de las credenciales especiales. */
  @Column({ type: 'varchar', length: 150, nullable: true })
  institution: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  schoolName: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  schoolModularCode: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ugel: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  disabilityType: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  disabilityClass: string | null;

  /** ID en el sistema de inscripción de origen (Mateus). */
  @Column({ type: 'varchar', length: 50, nullable: true })
  externalId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  externalDelegateId: string | null;

  /** Columnas del Excel sin campo propio (pruebas, marcas...). */
  @Column({ type: 'jsonb', nullable: true })
  extraData: Record<string, unknown> | null;

  @Index()
  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    enumName: 'participant_status',
    default: ParticipantStatus.PENDING_DOCUMENTS,
  })
  status: ParticipantStatus;

  @Column({ default: true })
  isActive: boolean;
}
