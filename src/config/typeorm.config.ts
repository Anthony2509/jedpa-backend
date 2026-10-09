import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import {
  baseDataSourceOptions,
  connectionOptions,
} from '../database/database.options';

export const typeOrmConfigFactory = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  ...baseDataSourceOptions,
  ...connectionOptions((key) => config.get(key)),
  // Todas las entidades (las relaciones cruzan módulos), igual que la CLI de migraciones.
  entities: [`${__dirname}/../**/*.entity.{ts,js}`],
  // El esquema se gestiona con migraciones, nunca con synchronize.
});
