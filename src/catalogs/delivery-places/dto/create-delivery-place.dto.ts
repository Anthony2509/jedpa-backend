import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trim } from '../../../common/utils/text';

export class CreateDeliveryPlaceDto {
  @ApiProperty({ example: 'Sede competencia – Videna, San Luis' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MaxLength(150, { message: 'El nombre no puede superar 150 caracteres.' })
  name: string;
}
