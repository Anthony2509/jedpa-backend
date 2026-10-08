import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../../database/base.entity';

@Entity('delivery_places')
export class DeliveryPlace extends AppBaseEntity {
  @Column({ length: 150, unique: true })
  name: string;

  @Column({ default: true })
  isActive: boolean;
}
