import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { trim, trimLower, trimUpper } from '../../common/utils/text';
import { Gender, IdentityDocumentType } from '../enums';

export class CreateParticipantDto {
  @ApiProperty({ enum: IdentityDocumentType })
  @IsEnum(IdentityDocumentType, {
    message: 'El tipo de documento debe ser DNI, CE o PASAPORTE.',
  })
  documentType: IdentityDocumentType;

  @ApiProperty({
    example: '00007342',
    description: 'DNI: 8 dígitos. CE y pasaporte: 6 a 12 alfanuméricos.',
  })
  @Transform(trimUpper)
  @IsString()
  @IsNotEmpty({ message: 'El número de documento es obligatorio.' })
  @MaxLength(20)
  documentNumber: string;

  @ApiProperty({ example: 'Juan Carlos' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Los nombres son obligatorios.' })
  @MaxLength(100)
  firstNames: string;

  @ApiProperty({ example: 'Pérez' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'El apellido paterno es obligatorio.' })
  @MaxLength(100)
  paternalLastName: string;

  @ApiPropertyOptional({ example: 'Quispe' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  maternalLastName?: string;

  @ApiPropertyOptional({
    enum: Gender,
    description: 'Obligatorio para tipos regulares',
  })
  @IsOptional()
  @IsEnum(Gender, { message: 'El género debe ser FEMALE o MALE.' })
  gender?: Gender;

  @ApiPropertyOptional({
    example: '2012-05-20',
    description: 'Obligatoria para tipos regulares',
  })
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'La fecha de nacimiento debe tener el formato AAAA-MM-DD.' },
  )
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de nacimiento debe tener el formato AAAA-MM-DD.',
  })
  birthDate?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'participantTypeId debe ser un UUID válido.' })
  participantTypeId: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Obligatoria para tipos regulares; vacía para especiales',
  })
  @IsOptional()
  @IsUUID('4', { message: 'delegationId debe ser un UUID válido.' })
  delegationId?: string;

  @ApiPropertyOptional({
    example: 'Especialista DRE Ucayali',
    description: 'Servicio / Institución: obligatoria para tipos especiales',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  institution?: string;

  @ApiPropertyOptional({ example: 'IE 0001 San Martín' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  schoolName?: string;

  @ApiPropertyOptional({ example: '0234567', description: 'Código modular' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  schoolModularCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  ugel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({ example: '987654321' })
  @IsOptional()
  @Transform(trim)
  @Matches(/^\+?[\d\s-]{6,20}$/, { message: 'El teléfono no es válido.' })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimLower)
  @IsEmail({}, { message: 'El correo no es válido.' })
  @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({ example: 'Intelectual' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  disabilityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  disabilityClass?: string;

  @ApiPropertyOptional({
    description: 'ID en el sistema de inscripción (Mateus)',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(50)
  externalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(50)
  externalDelegateId?: string;

  @ApiPropertyOptional({
    example: { prueba1: '100 m planos', marca1: '12.5' },
    description: 'Columnas del Excel sin campo propio',
  })
  @IsOptional()
  @IsObject({ message: 'extraData debe ser un objeto JSON.' })
  extraData?: Record<string, unknown>;
}
