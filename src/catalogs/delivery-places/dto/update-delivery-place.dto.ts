import { PartialType } from '@nestjs/swagger';
import { CreateDeliveryPlaceDto } from './create-delivery-place.dto';

export class UpdateDeliveryPlaceDto extends PartialType(
  CreateDeliveryPlaceDto,
) {}
