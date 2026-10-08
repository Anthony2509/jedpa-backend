import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { DocumentType } from '../../catalogs/document-types/entities/document-type.entity';
import { AppBaseEntity } from '../../database/base.entity';
import { Participant } from '../../participants/entities/participant.entity';
import { StoredFile } from '../../storage/entities/stored-file.entity';
import { User } from '../../users/entities/user.entity';
import { DocumentStatus } from '../enums/document-status.enum';

@Entity('participant_documents')
@Unique(['participantId', 'documentTypeId'])
export class ParticipantDocument extends AppBaseEntity {
  @Index()
  @Column('uuid')
  participantId: string;

  @ManyToOne(() => Participant, { nullable: false })
  @JoinColumn()
  participant: Participant;

  @Column('uuid')
  documentTypeId: string;

  @ManyToOne(() => DocumentType, { nullable: false })
  @JoinColumn()
  documentType: DocumentType;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    enumName: 'document_status',
    default: DocumentStatus.PENDING,
  })
  status: DocumentStatus;

  @Column({ type: 'uuid', nullable: true })
  fileId: string | null;

  @ManyToOne(() => StoredFile, { nullable: true })
  @JoinColumn()
  file: StoredFile | null;

  @Column({ type: 'text', nullable: true })
  observation: string | null;

  @Column({ type: 'uuid', nullable: true })
  reviewedById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  reviewedBy: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;
}
