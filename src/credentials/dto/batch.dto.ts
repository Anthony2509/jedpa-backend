import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsUUID,
} from 'class-validator';

export const MAX_BATCH = 100;

/** Lista de UUID únicos, de 1 a MAX_BATCH elementos. */
const ids = (field: string, description: string) =>
  applyDecorators(
    ApiProperty({ type: [String], format: 'uuid', description }),
    ArrayMinSize(1, { message: `Indique al menos un elemento en ${field}.` }),
    ArrayMaxSize(MAX_BATCH, { message: `Máximo ${MAX_BATCH} por operación.` }),
    ArrayUnique({ message: `Hay elementos repetidos en ${field}.` }),
    IsUUID('4', {
      each: true,
      message: `${field} debe contener UUID válidos.`,
    }),
  );

export class BatchIssueDto {
  @ids('participantIds', 'Participantes a los que se emite el ORIGINAL')
  participantIds: string[];
}

export class IssuedItemDto {
  @ApiProperty({ format: 'uuid' })
  participantId: string;

  @ApiProperty({ format: 'uuid' })
  copyId: string;
}

export class SkippedItemDto {
  @ApiProperty({ format: 'uuid' })
  participantId: string;

  @ApiProperty({ example: 'No se puede imprimir: requisitos sin cumplir.' })
  reason: string;
}

export class BatchIssueResultDto {
  @ApiProperty({ type: IssuedItemDto, isArray: true })
  issued: IssuedItemDto[];

  @ApiProperty({ type: SkippedItemDto, isArray: true })
  skipped: SkippedItemDto[];
}

export class CopiesPdfDto {
  @ids('copyIds', 'Ejemplares vigentes a incluir en el PDF, en este orden')
  copyIds: string[];
}
