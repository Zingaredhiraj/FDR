import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

async function loginAs(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'Demo@1234' });
  return res.body.data?.accessToken;
}

describe('RBAC', () => {
  it('AUDITOR cannot access user management', async () => {
    const token = await loginAs('auditor@aicte.demo');
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('INSTITUTION_USER cannot access users list', async () => {
    const token = await loginAs('institution@aicte.demo');
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('SUPER_ADMIN can access users list', async () => {
    const token = await loginAs('admin@aicte.demo');
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('INSTITUTION_USER cannot access jobs endpoint', async () => {
    const token = await loginAs('institution@aicte.demo');
    const res = await request(app)
      .post('/api/v1/jobs/status')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('FINANCE_OFFICER cannot access audit log', async () => {
    const token = await loginAs('finance@aicte.demo');
    const res = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
