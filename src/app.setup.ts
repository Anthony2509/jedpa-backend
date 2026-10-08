import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { createValidationPipe } from './common/pipes/validation.pipe';

/** Configuración HTTP común a main.ts y a las pruebas e2e. */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors({ origin: config.getOrThrow<string>('FRONTEND_URL') });
  app.useGlobalPipes(createValidationPipe());
  app.enableShutdownHooks();
}
