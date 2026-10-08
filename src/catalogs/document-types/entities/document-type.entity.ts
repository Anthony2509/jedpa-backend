import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../../database/base.entity';

@Entity('document_types')
export class DocumentType extends AppBaseEntity {
  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 150 })
  name: string;

  /** Documentos con datos de salud (certificado médico, discapacidad). */
  @Column({ default: false })
  isSensitive: boolean;

  @Column({ default: true })
  isActive: boolean;
}
