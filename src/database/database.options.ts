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

type EnvReader = (key: string) => string | number | boolean | undefined;

/**
 * Conexión a PostgreSQL desde variables de entorno:
 * - DATABASE_URL (la que entrega Railway) tiene prioridad;
 * - si no, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_NAME (desarrollo con Docker).
 * DB_SSL=true activa TLS (proveedores que lo exigen por red pública).
 */
export function connectionOptions(env: EnvReader) {
  const ssl =
    String(env('DB_SSL')) === 'true' ? { rejectUnauthorized: false } : false;
  const url = env('DATABASE_URL');
  if (url) return { url: String(url), ssl };
  return {
    host: String(env('DB_HOST')),
    port: Number(env('DB_PORT')),
    username: String(env('DB_USER')),
    password: String(env('DB_PASSWORD')),
    database: String(env('DB_NAME')),
    ssl,
  };
}
