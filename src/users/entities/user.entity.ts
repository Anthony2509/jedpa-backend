import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AppBaseEntity } from '../../database/base.entity';
import { Role } from '../../roles/entities/role.entity';

@Entity('users')
export class User extends AppBaseEntity {
  /** Siempre en minúsculas. */
  @Column({ length: 150, unique: true })
  email: string;

  @Column({ length: 150 })
  fullName: string;

  /** Nunca se selecciona por defecto ni se devuelve en respuestas. */
  @Column({ length: 100, select: false })
  passwordHash: string;

  @Column('uuid')
  roleId: string;

  @ManyToOne(() => Role, { nullable: false })
  @JoinColumn()
  role: Role;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;
}
