import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { AppBaseEntity } from '../../../database/base.entity';
import { ParticipantType } from '../../participant-types/entities/participant-type.entity';
import { DocumentType } from './document-type.entity';

/** Qué documentos exige cada tipo de participante. Fuente de verdad de la habilitación. */
@Entity('document_requirements')
@Unique(['participantTypeId', 'documentTypeId'])
export class DocumentRequirement extends AppBaseEntity {
  @Column('uuid')
  participantTypeId: string;

  @ManyToOne(() => ParticipantType, { nullable: false })
  @JoinColumn()
  participantType: ParticipantType;

  @Column('uuid')
  documentTypeId: string;

  @ManyToOne(() => DocumentType, { nullable: false })
  @JoinColumn()
  documentType: DocumentType;

  @Column({ default: true })
  isRequired: boolean;
}
