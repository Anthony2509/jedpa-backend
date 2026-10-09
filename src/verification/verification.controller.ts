import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { VerificationDto } from './verification.dto';
import { VerificationService } from './verification.service';

@ApiTags('Verificación (QR)')
@Controller('verify')
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Public()
  @Get(':token')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Verifica una credencial por su QR (público)',
    description:
      'Datos mínimos para el control en puerta y estado de los documentos obligatorios. Sin DNI, foto ni archivos. ' +
      'Una credencial reemplazada por un duplicado responde valid=false sin datos personales.',
  })
  verify(@Param('token') token: string): Promise<VerificationDto> {
    return this.verification.verify(token);
  }
}
