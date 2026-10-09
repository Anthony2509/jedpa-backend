import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CredentialCopy } from '../entities/credential-copy.entity';
import { copyLabel } from '../credential-rules';

export class CredentialUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  fullName: string;
}

export class CredentialCopyDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ description: '0 = original; 1..3 = duplicados' })
  copyNumber: number;

  @ApiProperty({ example: 'Duplicado 1' })
  label: string;

  @ApiProperty()
  printedAt: Date;

  @ApiProperty({ type: CredentialUserDto })
  printedBy: CredentialUserDto;

  @ApiPropertyOptional({ nullable: true })
  reason: string | null;

  @ApiProperty({
    description: 'QR revocado: lo reemplazó un duplicado posterior',
  })
  isRevoked: boolean;

  @ApiProperty({ description: 'Token del QR (GET /api/verify/:token)' })
  verificationToken: string;

  @ApiProperty({ description: 'URL que contiene el QR' })
  verificationUrl: string;

  static from(copy: CredentialCopy, verifyBaseUrl: string): CredentialCopyDto {
    return {
      id: copy.id,
      copyNumber: copy.copyNumber,
      label: copyLabel(copy.copyNumber),
      printedAt: copy.printedAt,
      printedBy: { id: copy.printedBy.id, fullName: copy.printedBy.fullName },
      reason: copy.reason,
      isRevoked: copy.isRevoked,
      verificationToken: copy.verificationToken,
      verificationUrl: `${verifyBaseUrl}/${copy.verificationToken}`,
    };
  }
}
