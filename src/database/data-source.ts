import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { baseDataSourceOptions } from './database.options';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

/** DataSource exclusivo de la CLI: npm run migration:* y npm run seed. */
export default new DataSource({
  ...baseDataSourceOptions,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [`${__dirname}/../**/*.entity.{ts,js}`],
  migrations: [`${__dirname}/migrations/*.{ts,js}`],
});
