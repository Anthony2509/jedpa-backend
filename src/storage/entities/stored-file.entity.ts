import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AppBaseEntity } from '../../database/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Archivo en el almacenamiento externo (Cloudinary, privado).
 * Un mismo archivo puede vincularse a varios participantes (Resolución Directoral).
 */
@Entity('stored_files')
export class StoredFile extends AppBaseEntity {
  @Column({ length: 30 })
  provider: string;

  @Column({ length: 255, unique: true })
  storageKey: string;

  @Column({ length: 255 })
  originalName: string;

  @Column({ length: 100 })
  mimeType: string;

  @Column('int')
  sizeBytes: number;

  @Column('uuid')
  uploadedById: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn()
  uploadedBy: User;
}
