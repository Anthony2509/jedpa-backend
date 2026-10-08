import { Check, Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { MacroRegion } from '../../catalogs/macro-regions/entities/macro-region.entity';
import { Sport } from '../../catalogs/sports/entities/sport.entity';
import { AppBaseEntity } from '../../database/base.entity';

/** Letra de género usada en el código de delegación. */
export enum DelegationGender {
  WOMEN = 'D',
  MEN = 'V',
}

/** Una macrorregión en una disciplina, categoría y género. Código: M1-AJD-B-D. */
@Entity('delegations')
@Unique(['macroRegionId', 'sportId', 'category', 'gender'])
@Check(`"category" ~ '^[A-Z]$'`)
export class Delegation extends AppBaseEntity {
  @Column({ length: 30, unique: true })
  code: string;

  @Column('uuid')
  macroRegionId: string;

  @ManyToOne(() => MacroRegion, { nullable: false })
  @JoinColumn()
  macroRegion: MacroRegion;

  @Column('uuid')
  sportId: string;

  @ManyToOne(() => Sport, { nullable: false })
  @JoinColumn()
  sport: Sport;

  @Column({ length: 1 })
  category: string;

  @Column({
    type: 'enum',
    enum: DelegationGender,
    enumName: 'delegation_gender',
  })
  gender: DelegationGender;

  @Column({ default: true })
  isActive: boolean;
}
