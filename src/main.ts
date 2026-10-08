import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors({ origin: config.getOrThrow<string>('FRONTEND_URL') });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  if (config.getOrThrow<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('JEDPA API')
      .setDescription(
        'API de la plataforma de credenciales de los Juegos Escolares Deportivos y Paradeportivos',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addSecurityRequirements('bearer')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = config.getOrThrow<number>('PORT');
  await app.listen(port);
  Logger.log(`Aplicación escuchando en el puerto ${port}`, 'Bootstrap');
}

void bootstrap();
