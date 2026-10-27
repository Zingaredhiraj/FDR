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

describe('Release Gates & Workflow', () => {
  it('Release gate blocks when FDR is not document-complete (HTTP 422)', async () => {
    const token = await loginAs('finance@aicte.demo');

    // Find an FDR with missing or unverified documents
    const incompleteFdr = await prisma.fdr.findFirst({
      where: {
        deletedAt: null,
        status: 'MATURED',
        documents: {
          none: { documentType: 'LIEN_LETTER', verificationStatus: 'VERIFIED' },
        },
      },
    });

    if (incompleteFdr) {
      const res = await request(app)
        .post('/api/v1/releases')
        .set('Authorization', `Bearer ${token}`)
        .send({ fdrId: incompleteFdr.id, prematureRelease: false });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/document-complete/i);
    }
  });

  it('Release gate blocks when premature without reason (HTTP 422)', async () => {
    const token = await loginAs('finance@aicte.demo');

    // Find an ACTIVE FDR
    const activeFdr = await prisma.fdr.findFirst({
      where: { deletedAt: null, status: 'ACTIVE' },
    });

    if (activeFdr) {
      const res = await request(app)
        .post('/api/v1/releases')
        .set('Authorization', `Bearer ${token}`)
        .send({ fdrId: activeFdr.id, prematureRelease: false });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    }
  });

  it('Public release verification works for released FDR', async () => {
    const releasedReq = await prisma.releaseRequest.findFirst({
      where: { status: 'RELEASED' },
    });

    if (releasedReq) {
      const res = await request(app)
        .get(`/api/v1/public/verify-release/${encodeURIComponent(releasedReq.referenceNumber)}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.referenceNumber).toBe(releasedReq.referenceNumber);
    }
  });

  it('Public release verification returns invalid for nonexistent reference', async () => {
    const res = await request(app)
      .get('/api/v1/public/verify-release/AICTE-NONEXISTENT-999');

    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(false);
  });
});
