import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../database/base.entity';

@Entity('roles')
export class Role extends AppBaseEntity {
  @Column({ length: 50, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;
}
