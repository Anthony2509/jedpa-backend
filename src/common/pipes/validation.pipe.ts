import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

/** Mensajes en español para las validaciones genéricas de class-validator. */
function messagesFrom(errors: ValidationError[], parent = ''): string[] {
  return errors.flatMap((error) => {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.entries(error.constraints ?? {}).map(
      ([constraint, message]) =>
        constraint === 'whitelistValidation'
          ? `El campo ${path} no está permitido.`
          : message,
    );
    return [...own, ...messagesFrom(error.children ?? [], path)];
  });
}

/** ValidationPipe global: whitelist estricta, transformación y mensajes en español. */
export const createValidationPipe = () =>
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => new BadRequestException(messagesFrom(errors)),
  });
