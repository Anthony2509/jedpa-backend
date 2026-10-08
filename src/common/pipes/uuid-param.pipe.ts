import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';

/** Valida que el parámetro :id sea un UUID, con mensaje en español. */
export const UuidParamPipe = new ParseUUIDPipe({
  exceptionFactory: () =>
    new BadRequestException('El identificador no es un UUID válido.'),
});
