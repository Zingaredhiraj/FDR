import { describe, it, expect } from 'vitest';
import { runAlertJob } from '../src/jobs/alertJob';
import { runStatusJob } from '../src/jobs/statusJob';
import { prisma } from '../src/prisma';

describe('Jobs & Automation', () => {
  it('Alert job is idempotent (running twice produces zero duplicates)', async () => {
    // Run once
    const firstRun = await runAlertJob();
    const countAfterFirst = await prisma.alertLog.count();

    // Run again immediately
    const secondRun = await runAlertJob();
    const countAfterSecond = await prisma.alertLog.count();

    // The second run must create zero duplicates
    expect(secondRun.alertsCreated).toBe(0);
    expect(countAfterSecond).toBe(countAfterFirst);
  });

  it('Status job runs without errors and returns summary', async () => {
    const result = await runStatusJob();
    expect(result).toHaveProperty('fdrsUpdated');
    expect(typeof result.fdrsUpdated).toBe('number');
  });
});
