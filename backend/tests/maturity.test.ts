import { describe, it, expect } from 'vitest';
import { calculateMaturity, addMonths } from '../src/utils/maturity';

describe('calculateMaturity', () => {
  it('calculates cumulative interest correctly - ₹10,00,000 @ 7% for 12 months', () => {
    const result = calculateMaturity({
      principal: BigInt(10000000 * 100), // 1 crore in paise
      interestRate: 7,
      interestType: 'CUMULATIVE',
      tenureMonths: 12,
    }, new Date('2025-01-01'));

    // Expected: P * (1 + 7/400)^4 = 10000000 * (1.0175)^4
    const expected = Math.round(10000000 * 100 * Math.pow(1 + 7 / 400, 4));
    expect(result.maturityAmount).toBe(BigInt(expected));
    expect(result.quarterlyPayout).toBe(BigInt(0));
  });

  it('calculates quarterly payout correctly', () => {
    const principal = BigInt(5000000 * 100); // 50 lakh in paise
    const result = calculateMaturity({
      principal,
      interestRate: 8,
      interestType: 'QUARTERLY_PAYOUT',
      tenureMonths: 12,
    }, new Date('2025-01-01'));

    expect(result.maturityAmount).toBe(principal);
    // quarterlyPayout = P * r / 400
    const expectedQP = Math.round(Number(principal) * 8 / 400);
    expect(result.quarterlyPayout).toBe(BigInt(expectedQP));
  });

  it('handles leap year correctly (Feb 29)', () => {
    const date = new Date('2024-01-31');
    const result = calculateMaturity({
      principal: BigInt(100000000),
      interestRate: 7,
      interestType: 'CUMULATIVE',
      tenureMonths: 1,
    }, date);
    // Jan 31 + 1 month = Feb 29, 2024 (leap year)
    expect(result.maturityDate.getDate()).toBe(29);
    expect(result.maturityDate.getMonth()).toBe(1); // February
  });

  it('clamps month end correctly (Jan 31 + 1 = Feb 28 non-leap)', () => {
    const date = new Date('2025-01-31');
    const result = calculateMaturity({
      principal: BigInt(100000000),
      interestRate: 7,
      interestType: 'CUMULATIVE',
      tenureMonths: 1,
    }, date);
    // 2025 is not a leap year
    expect(result.maturityDate.getDate()).toBe(28);
    expect(result.maturityDate.getMonth()).toBe(1); // February
  });

  it('calculates 24-month tenure correctly', () => {
    const principal = BigInt(2500000 * 100);
    const result = calculateMaturity({
      principal,
      interestRate: 7.5,
      interestType: 'CUMULATIVE',
      tenureMonths: 24,
    }, new Date('2024-01-01'));

    const expected = Math.round(Number(principal) * Math.pow(1 + 7.5 / 400, 8));
    expect(result.maturityAmount).toBe(BigInt(expected));
  });

  it('handles 36-month tenure with correct date', () => {
    const result = calculateMaturity({
      principal: BigInt(100000 * 100),
      interestRate: 6.5,
      interestType: 'CUMULATIVE',
      tenureMonths: 36,
    }, new Date('2022-06-15'));

    expect(result.maturityDate.getFullYear()).toBe(2025);
    expect(result.maturityDate.getMonth()).toBe(5); // June (0-indexed)
    expect(result.maturityDate.getDate()).toBe(15);
  });
});

describe('addMonths', () => {
  it('adds months without clamping', () => {
    const result = addMonths(new Date('2024-03-15'), 3);
    expect(result.getMonth()).toBe(5); // June (0-indexed)
    expect(result.getDate()).toBe(15);
  });

  it('clamps to month end', () => {
    const result = addMonths(new Date('2024-03-31'), 1);
    // April only has 30 days
    expect(result.getMonth()).toBe(3); // April (0-indexed)
    expect(result.getDate()).toBe(30);
  });
});
