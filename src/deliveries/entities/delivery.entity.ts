import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { DeliveryPlace } from '../../catalogs/delivery-places/entities/delivery-place.entity';
import { CredentialCopy } from '../../credentials/entities/credential-copy.entity';
import { AppBaseEntity } from '../../database/base.entity';
import { User } from '../../users/entities/user.entity';

/** Entrega física de un ejemplar. Un ejemplar se entrega una sola vez. */
@Entity('deliveries')
export class Delivery extends AppBaseEntity {
  @Column({ type: 'uuid', unique: true })
  credentialCopyId: string;

  @OneToOne(() => CredentialCopy, { nullable: false })
  @JoinColumn()
  credentialCopy: CredentialCopy;

  @Column('uuid')
  deliveryPlaceId: string;

  @ManyToOne(() => DeliveryPlace, { nullable: false })
  @JoinColumn()
  deliveryPlace: DeliveryPlace;

  @Column({ type: 'timestamptz' })
  deliveredAt: Date;

  @Column('uuid')
  deliveredById: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn()
  deliveredBy: User;

  @Column({ type: 'text', nullable: true })
  observation: string | null;
}
