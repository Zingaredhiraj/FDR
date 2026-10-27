import { InterestType } from '../constants';

/**
 * Calculate maturity date by adding tenureMonths calendar months,
 * clamping to month-end if necessary.
 * E.g., 31 Jan + 1 month = 28/29 Feb
 */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const dayOfMonth = d.getDate();
  d.setMonth(d.getMonth() + months);
  // If the month rolled over (e.g., Mar when Feb doesn't have 31 days), go back
  if (d.getDate() !== dayOfMonth) {
    d.setDate(0); // last day of previous month
  }
  return d;
}

export interface MaturityInput {
  principal: bigint;        // in paise
  interestRate: number;     // annual rate e.g. 7.0 for 7%
  interestType: InterestType;
  tenureMonths: number;
}

export interface MaturityResult {
  maturityAmount: bigint;   // in paise
  quarterlyPayout: bigint;  // in paise, 0 for CUMULATIVE
  maturityDate: Date;
}

/**
 * Calculate maturity amount using quarterly compounding for CUMULATIVE
 * and simple interest for QUARTERLY_PAYOUT.
 *
 * CUMULATIVE: maturityAmount = P × (1 + r/400)^(4 × months/12)
 * QUARTERLY_PAYOUT: maturityAmount = P, quarterlyPayout = P × r / 400
 *
 * All amounts in paise (BigInt), computation uses floating point,
 * then rounds to nearest paisa.
 */
export function calculateMaturity(
  input: MaturityInput,
  issueDate: Date
): MaturityResult {
  const { principal, interestRate, interestType, tenureMonths } = input;

  const P = Number(principal);     // paise
  const r = interestRate;          // annual percent
  const n = tenureMonths / 12;     // years

  let maturityAmountPaise: number;
  let quarterlyPayoutPaise: number = 0;

  if (interestType === 'CUMULATIVE') {
    // Quarterly compounding: A = P * (1 + r/400)^(4n)
    const exponent = 4 * n;
    maturityAmountPaise = P * Math.pow(1 + r / 400, exponent);
  } else {
    // QUARTERLY_PAYOUT: principal returned at maturity, interest paid quarterly
    maturityAmountPaise = P;
    quarterlyPayoutPaise = P * r / 400;
  }

  // Round to nearest paisa
  const maturityAmount = BigInt(Math.round(maturityAmountPaise));
  const quarterlyPayout = BigInt(Math.round(quarterlyPayoutPaise));
  const maturityDate = addMonths(issueDate, tenureMonths);

  return { maturityAmount, quarterlyPayout, maturityDate };
}

/**
 * Serialize maturity result for JSON response.
 * BigInt fields become strings.
 */
export function serializeMaturityResult(result: MaturityResult) {
  return {
    maturityAmount: result.maturityAmount.toString(),
    quarterlyPayout: result.quarterlyPayout.toString(),
    maturityDate: result.maturityDate.toISOString(),
  };
}
