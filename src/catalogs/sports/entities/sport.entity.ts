import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../../database/base.entity';

@Entity('sports')
export class Sport extends AppBaseEntity {
  /** Abreviatura usada en el código de delegación: AJD, ATL… */
  @Column({ length: 10, unique: true })
  code: string;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ default: true })
  isActive: boolean;
}
