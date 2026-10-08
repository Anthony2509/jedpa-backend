import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsUUID, Matches } from 'class-validator';
import { trimUpper } from '../../common/utils/text';
import { DelegationGender } from '../entities/delegation.entity';

export class CreateDelegationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'macroRegionId debe ser un UUID válido.' })
  macroRegionId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'sportId debe ser un UUID válido.' })
  sportId: string;

  @ApiProperty({
    example: 'B',
    description: 'Categoría: una letra (A, B, C...)',
  })
  @Transform(trimUpper)
  @Matches(/^[A-Z]$/, { message: 'La categoría debe ser una sola letra.' })
  category: string;

  @ApiProperty({
    enum: DelegationGender,
    description: 'D = damas, V = varones',
  })
  @IsEnum(DelegationGender, {
    message: 'El género debe ser D (damas) o V (varones).',
  })
  gender: DelegationGender;
}
