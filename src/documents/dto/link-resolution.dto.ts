import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsUUID,
} from 'class-validator';

export const MAX_RESOLUTION_LINKS = 500;

export class LinkResolutionDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    description:
      'Participantes que figuran en la Resolución Directoral de la macrorregión',
  })
  @ArrayMinSize(1, { message: 'Indique al menos un participante.' })
  @ArrayMaxSize(MAX_RESOLUTION_LINKS, {
    message: `Máximo ${MAX_RESOLUTION_LINKS} participantes por operación.`,
  })
  @ArrayUnique({ message: 'Hay participantes repetidos.' })
  @IsUUID('4', {
    each: true,
    message: 'Cada participante debe ser un UUID válido.',
  })
  participantIds: string[];
}

export class LinkResolutionResultDto {
  @ApiProperty({ description: 'Participantes vinculados y aprobados' })
  linked: number;
}
