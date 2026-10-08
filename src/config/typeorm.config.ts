import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { baseDataSourceOptions } from '../database/database.options';

export const typeOrmConfigFactory = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  ...baseDataSourceOptions,
  host: config.getOrThrow<string>('DB_HOST'),
  port: config.getOrThrow<number>('DB_PORT'),
  username: config.getOrThrow<string>('DB_USER'),
  password: config.getOrThrow<string>('DB_PASSWORD'),
  database: config.getOrThrow<string>('DB_NAME'),
  // Todas las entidades (las relaciones cruzan módulos), igual que la CLI de migraciones.
  entities: [`${__dirname}/../**/*.entity.{ts,js}`],
  // El esquema se gestiona con migraciones, nunca con synchronize.
});
