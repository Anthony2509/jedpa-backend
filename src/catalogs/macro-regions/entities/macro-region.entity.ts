import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../../database/base.entity';

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

  @Column({ default: true })
  isActive: boolean;
}
