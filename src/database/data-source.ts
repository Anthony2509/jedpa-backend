import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { baseDataSourceOptions, connectionOptions } from './database.options';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

/**
 * DataSource exclusivo de la CLI: npm run migration:* y npm run seed.
 * Compilado (dist/) también sirve en producción: npm run migration:run:prod.
 */
export default new DataSource({
  ...baseDataSourceOptions,
  ...connectionOptions((key) => process.env[key]),
  entities: [`${__dirname}/../**/*.entity.{ts,js}`],
  migrations: [`${__dirname}/migrations/*.{ts,js}`],
});
