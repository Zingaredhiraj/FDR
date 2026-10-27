/**
 * Get today's date in IST (Asia/Kolkata timezone), as a UTC midnight Date.
 * This ensures consistent "today" computation across server timezones.
 */
export function getTodayIST(): Date {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC+5:30
  const istDate = new Date(now.getTime() + istOffset);
  // Return midnight UTC of the IST date
  return new Date(
    Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), istDate.getUTCDate())
  );
}

/**
 * Difference in days between two dates (a - b), ignoring time.
 */
export function diffDays(a: Date, b: Date): number {
  const aMs = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bMs = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((aMs - bMs) / (1000 * 60 * 60 * 24));
}

/**
 * Format a date as YYYY-MM-DD
 */
export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get financial year string (e.g., "2025-26") for a given date.
 * Financial year runs April 1 to March 31.
 */
export function getFinancialYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-indexed
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(2)}`;
  } else {
    return `${year - 1}-${String(year).slice(2)}`;
  }
}

/**
 * Get start and end dates for the current financial year (Apr 1 to Mar 31)
 */
export function getCurrentFinancialYearRange(): { start: Date; end: Date } {
  const today = getTodayIST();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const fyStartYear = month >= 4 ? year : year - 1;
  return {
    start: new Date(Date.UTC(fyStartYear, 3, 1)),       // April 1
    end: new Date(Date.UTC(fyStartYear + 1, 2, 31)),    // March 31
  };
}
