import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/prisma';

async function loginAs(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'Demo@1234' });
  return res.body.data?.accessToken;
}

describe('Institution Isolation', () => {
  it('INSTITUTION_USER gets 404 for another institution', async () => {
    const token = await loginAs('institution@aicte.demo');

    // Get the institution user's institutionId
    const instUser = await prisma.user.findUnique({
      where: { email: 'institution@aicte.demo' },
    });

    // Find a different institution
    const otherInst = await prisma.institution.findFirst({
      where: { id: { not: instUser!.institutionId! }, deletedAt: null },
    });

    if (!otherInst) {
      // Skip if there's no other institution
      return;
    }

    const res = await request(app)
      .get(`/api/v1/institutions/${otherInst.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('INSTITUTION_USER can access their own institution', async () => {
    const token = await loginAs('institution@aicte.demo');

    const instUser = await prisma.user.findUnique({
      where: { email: 'institution@aicte.demo' },
    });

    const res = await request(app)
      .get(`/api/v1/institutions/${instUser!.institutionId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('INSTITUTION_USER FDR list is scoped to their institution', async () => {
    const token = await loginAs('institution@aicte.demo');

    const instUser = await prisma.user.findUnique({
      where: { email: 'institution@aicte.demo' },
    });

    const res = await request(app)
      .get('/api/v1/fdrs')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    // All returned FDRs must belong to the institution user's institution
    const fdrs: { institutionId: string }[] = res.body.data;
    if (fdrs.length > 0) {
      fdrs.forEach(fdr => {
        expect(fdr.institutionId).toBe(instUser!.institutionId);
      });
    }
  });
});
