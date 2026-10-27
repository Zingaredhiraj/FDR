import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Auth API', () => {
  it('POST /api/v1/auth/login - success with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@aicte.demo', password: 'Demo@1234' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
  });

  it('POST /api/v1/auth/login - fails with wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@aicte.demo', password: 'WrongPassword!' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/refresh - rotates token', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'finance@aicte.demo', password: 'Demo@1234' });
    const { refreshToken } = loginRes.body.data;

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeTruthy();
    expect(refreshRes.body.data.refreshToken).toBeTruthy();
    expect(refreshRes.body.data.refreshToken).not.toBe(refreshToken);
  });

  it('POST /api/v1/auth/refresh - reuse detection revokes all tokens', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'verifier@aicte.demo', password: 'Demo@1234' });
    const { refreshToken } = loginRes.body.data;

    // Use the token once
    await request(app).post('/api/v1/auth/refresh').send({ refreshToken });

    // Try to reuse the old token — should be rejected
    const reuseRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(reuseRes.status).toBe(401);
  });

  it('GET /api/v1/auth/me - returns user info', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@aicte.demo', password: 'Demo@1234' });
    const { accessToken } = loginRes.body.data;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe('admin@aicte.demo');
    expect(meRes.body.data.role).toBe('SUPER_ADMIN');
  });

  it('GET /api/v1/auth/me - fails without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
