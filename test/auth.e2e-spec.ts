import request from 'supertest';
import { E2E_ADMIN } from './e2e-env';
import { createTestApp, TestApp } from './e2e-utils';

describe('Autenticación (e2e)', () => {
  let app: TestApp;
  let accessToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health es público', () =>
    request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok' }));

  it('rechaza rutas protegidas sin token con la forma de error uniforme', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .expect(401);
    expect(res.body).toMatchObject({
      statusCode: 401,
      message: 'Sesión inválida o expirada.',
      error: 'Unauthorized',
      path: '/api/auth/me',
    });
    expect(res.body).toHaveProperty('timestamp');
  });

  it('rechaza credenciales inválidas con un mensaje genérico', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: E2E_ADMIN.email, password: 'incorrecta' })
      .expect(401);
    expect(res.body).toMatchObject({
      message: 'Correo o contraseña incorrectos.',
    });
  });

  it('rechaza campos no permitidos con mensaje en español', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ ...E2E_ADMIN, role: 'ADMIN' })
      .expect(400);
    expect(res.body).toMatchObject({
      message: ['El campo role no está permitido.'],
    });
  });

  it('inicia sesión sin distinguir mayúsculas en el correo', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ ...E2E_ADMIN, email: E2E_ADMIN.email.toUpperCase() })
      .expect(200);
    const body = res.body as { accessToken: string; user: object };
    expect(body.user).toMatchObject({ email: E2E_ADMIN.email, role: 'ADMIN' });
    expect(body.user).not.toHaveProperty('passwordHash');
    accessToken = body.accessToken;
  });

  it('GET /api/auth/me devuelve el usuario autenticado', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body).toMatchObject({ email: E2E_ADMIN.email, role: 'ADMIN' });
  });

  it('rechaza un token manipulado', () =>
    request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}x`)
      .expect(401));
});
