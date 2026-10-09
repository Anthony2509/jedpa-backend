import { ApiProperty } from '@nestjs/swagger';

export class ImportRowErrorDto {
  @ApiProperty({ example: 12, description: 'Fila del Excel' })
  row: number;

  @ApiProperty({ type: [String] })
  errors: string[];
}

export class ImportPreviewDto {
  @ApiProperty({ example: 'LISTA LIMPIA' })
  sheet: string;

  @ApiProperty({ description: 'Filas con número de documento' })
  totalRows: number;

  @ApiProperty({ description: 'Filas sin errores' })
  validRows: number;

  @ApiProperty({ description: 'Filas con errores (bloquean la importación)' })
  invalidRows: number;

  @ApiProperty({ description: 'Participantes nuevos que se crearían' })
  toCreate: number;

  @ApiProperty({ description: 'Ya registrados: se omiten, no se sobrescriben' })
  alreadyRegistered: number;

  @ApiProperty({ type: [String], example: ['M1-AJD-B-D'] })
  newDelegations: string[];

  @ApiProperty({ example: { DEPORTISTA: 120, DELEGADO: 8 } })
  byType: Record<string, number>;

  @ApiProperty({
    type: ImportRowErrorDto,
    isArray: true,
    description: 'Primeras 500 filas con errores',
  })
  errors: ImportRowErrorDto[];
}

export class ImportResultDto {
  @ApiProperty()
  created: number;

  @ApiProperty({ description: 'Ya registrados: omitidos' })
  skippedExisting: number;

  @ApiProperty({ type: [String] })
  delegationsCreated: string[];
}
