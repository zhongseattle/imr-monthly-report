import { format, startOfYear, endOfYear, differenceInDays, getDaysInMonth, parseISO, startOfMonth, endOfMonth, isAfter, isBefore } from 'date-fns';

/**
 * Get the fiscal year for a given date
 * Assumes Amazon's fiscal year starts on January 1
 */
export function getFiscalYear(date: Date = new Date()): number {
  return date.getFullYear();
}

/**
 * Get the start date of the fiscal year
 */
export function getFiscalYearStart(fiscalYear?: number): Date {
  const year = fiscalYear || getFiscalYear();
  return startOfYear(new Date(year, 0, 1));
}

/**
 * Get the end date of the fiscal year
 */
export function getFiscalYearEnd(fiscalYear?: number): Date {
  const year = fiscalYear || getFiscalYear();
  return endOfYear(new Date(year, 11, 31));
}

/**
 * Calculate the total number of days in a fiscal year
 */
export function getDaysInFiscalYear(fiscalYear?: number): number {
  const start = getFiscalYearStart(fiscalYear);
  const end = getFiscalYearEnd(fiscalYear);
  return differenceInDays(end, start) + 1; // +1 to include both start and end dates
}

/**
 * Calculate the number of days elapsed in the fiscal year up to a given date
 */
export function getDaysElapsed(date: Date = new Date(), fiscalYear?: number): number {
  const start = getFiscalYearStart(fiscalYear);
  const currentDate = new Date(date);
  
  // If date is before fiscal year start, return 0
  if (isBefore(currentDate, start)) {
    return 0;
  }
  
  return differenceInDays(currentDate, start) + 1; // +1 to include start date
}

/**
 * Validate that the date is within the fiscal year boundaries
 */
export function validateFiscalYearDate(date: Date, fiscalYear?: number): {
  isValid: boolean;
  error?: string;
} {
  const start = getFiscalYearStart(fiscalYear);
  const end = getFiscalYearEnd(fiscalYear);
  const currentDate = new Date(date);

  if (isBefore(currentDate, start)) {
    return {
      isValid: false,
      error: `Date ${format(currentDate, 'yyyy-MM-dd')} is before fiscal year start ${format(start, 'yyyy-MM-dd')}`,
    };
  }

  if (isAfter(currentDate, end)) {
    // Use fiscal year end date for calculations if current date is after fiscal year end
    return {
      isValid: true,
      error: undefined,
    };
  }

  return { isValid: true };
}

/**
 * Get all months in the fiscal year up to the current date
 */
export function getMonthsInFiscalYearToDate(currentDate: Date = new Date(), fiscalYear?: number): Date[] {
  const start = getFiscalYearStart(fiscalYear);
  const end = new Date(currentDate);
  const months: Date[] = [];

  let current = startOfMonth(start);
  const endOfCurrentMonth = startOfMonth(end);

  while (!isAfter(current, endOfCurrentMonth)) {
    months.push(new Date(current));
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  return months;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format date for display
 */
export function formatDisplayDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM dd, yyyy');
}

/**
 * Format month for display
 */
export function formatMonth(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMMM yyyy');
}

/**
 * Get month key in YYYY-MM format
 */
export function getMonthKey(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM');
}
