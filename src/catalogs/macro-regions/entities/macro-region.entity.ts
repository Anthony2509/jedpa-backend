import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AppBaseEntity } from '../../../database/base.entity';
import { StoredFile } from '../../../storage/entities/stored-file.entity';

@Entity('macro_regions')
export class MacroRegion extends AppBaseEntity {
  /** M1 … M8 */
  @Column({ length: 10, unique: true })
  code: string;

  @Column({ length: 100 })
  name: string;

  /** Sede de la macrorregión (pendiente de confirmar para 2026). */
  @Column({ type: 'varchar', length: 100, nullable: true })
  headquarters: string | null;

  /** Resolución Directoral vigente: un PDF por macrorregión, vinculado a cada participante. */
  @Column({ type: 'uuid', nullable: true })
  resolutionFileId: string | null;

  @ManyToOne(() => StoredFile, { nullable: true })
  @JoinColumn()
  resolutionFile: StoredFile | null;

  @Column({ default: true })
  isActive: boolean;
}
