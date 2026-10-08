import { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from './snake-naming.strategy';

/** Opciones compartidas por la app (TypeOrmModule) y la CLI de migraciones. */
export const baseDataSourceOptions = {
  type: 'postgres',
  uuidExtension: 'pgcrypto',
  namingStrategy: new SnakeNamingStrategy(),
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
} as const satisfies Partial<DataSourceOptions>;
