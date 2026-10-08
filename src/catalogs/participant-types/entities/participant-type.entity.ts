import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../../database/base.entity';

/** REGULAR: requiere documentos y delegación. SPECIAL: se emite sin documentos. */
export enum ParticipantTypeCategory {
  REGULAR = 'REGULAR',
  SPECIAL = 'SPECIAL',
}

export enum AccessLevel {
  TOTAL = 'TOTAL',
  PARTIAL = 'PARTIAL',
}

@Entity('participant_types')
export class ParticipantType extends AppBaseEntity {
  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: ParticipantTypeCategory,
    enumName: 'participant_type_category',
  })
  category: ParticipantTypeCategory;

  /** Nivel de acceso impreso en la credencial; null mientras no se confirme. */
  @Column({
    type: 'enum',
    enum: AccessLevel,
    enumName: 'access_level',
    nullable: true,
  })
  accessLevel: AccessLevel | null;

  @Column({ default: true })
  isActive: boolean;
}
