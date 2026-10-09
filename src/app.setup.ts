import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { createValidationPipe } from './common/pipes/validation.pipe';

/** Configuración HTTP común a main.ts y a las pruebas e2e. */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  if (config.getOrThrow<string>('NODE_ENV') === 'production') {
    // Detrás del proxy de la plataforma (Railway): IP real del cliente para la
    // auditoría y el límite de peticiones.
    (app as NestExpressApplication).set('trust proxy', 1);
  }
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors({ origin: config.getOrThrow<string>('FRONTEND_URL') });
  app.useGlobalPipes(createValidationPipe());
  app.enableShutdownHooks();
}
