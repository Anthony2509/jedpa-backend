import { existsSync } from 'node:fs';

/**
 * Entorno de las pruebas e2e. Usa SIEMPRE una base de datos aparte (jedpa_test),
 * que se recrea en cada ejecución: nunca toca la base de desarrollo.
 */
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_TEST_NAME ?? 'jedpa_test';
process.env.JWT_SECRET = 'jedpa-e2e-secret-'.padEnd(48, 'x');
process.env.JWT_EXPIRES_IN = '1h';
process.env.FRONTEND_URL ??= 'http://localhost:3000';

if (!process.env.DB_NAME.endsWith('_test')) {
  throw new Error(
    `Las pruebas e2e solo corren sobre una base *_test (recibido: ${process.env.DB_NAME}).`,
  );
}
