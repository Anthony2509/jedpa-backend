import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { baseDataSourceOptions } from '../src/database/database.options';
import { runSeed } from '../src/database/seeds/seed-runner';
import { E2E_ADMIN } from './e2e-env';

const connection = () => ({
  ...baseDataSourceOptions,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/** Recrea la base de prueba, aplica migraciones y carga el seed. */
export default async function globalSetup(): Promise<void> {
  const database = process.env.DB_NAME as string;

  const server = new DataSource({ ...connection(), database: 'postgres' });
  await server.initialize();
  await server.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
  await server.query(`CREATE DATABASE "${database}"`);
  await server.destroy();

  const dataSource = new DataSource({
    ...connection(),
    database,
    entities: [join(__dirname, '../src/**/*.entity.ts')],
    migrations: [join(__dirname, '../src/database/migrations/*.ts')],
  });
  await dataSource.initialize();
  await dataSource.runMigrations();
  await runSeed(
    dataSource,
    {
      SEED_ADMIN_EMAIL: E2E_ADMIN.email,
      SEED_ADMIN_PASSWORD: E2E_ADMIN.password,
    },
    () => undefined,
  );
  await dataSource.destroy();
}
