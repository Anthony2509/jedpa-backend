import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { RoleName, ROLES } from '../src/common/constants/roles';
import {
  DEV_USER_PASSWORD,
  DEV_USER_SEEDS,
} from '../src/database/seeds/seed-data';

export type TestApp = INestApplication<App>;

/** Credenciales de los usuarios que crea el seed (uno por rol). */
export const devUser = (role: RoleName) => ({
  email: DEV_USER_SEEDS.find((u) => u.role === role)!.email,
  password: DEV_USER_PASSWORD,
});

export const E2E_ADMIN = devUser(ROLES.ADMIN);

/** Levanta la app con la misma configuración HTTP que main.ts. */
export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<TestApp>();
  configureApp(app);
  await app.init();
  return app;
}

/** Inicia sesión y devuelve el encabezado Authorization. */
export async function loginAs(
  app: TestApp,
  email: string,
  password: string,
): Promise<{ Authorization: string }> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  const { accessToken } = res.body as { accessToken: string };
  return { Authorization: `Bearer ${accessToken}` };
}

/**
 * Busca un elemento de catálogo por código (roles por name).
 * Resuélvelo ANTES de construir otra petición: un await dentro de .send() cierra el
 * servidor efímero de supertest y la petición exterior falla ("reading address").
 */
export async function catalogId(
  app: TestApp,
  auth: { Authorization: string },
  path: string,
  code: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .get(`/api/${path}`)
    .set(auth)
    .expect(200);
  const items = res.body as { id: string; code?: string; name?: string }[];
  const item = items.find((i) => (i.code ?? i.name) === code);
  if (!item) throw new Error(`No existe ${code} en /${path}`);
  return item.id;
}
