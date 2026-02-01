import { getDaysInMonth, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import type { SpendData, MonthlyBurnRate, ForecastResult } from '../types';
import {
  getFiscalYear,
  getFiscalYearStart,
  getFiscalYearEnd,
  getDaysInFiscalYear,
  getDaysElapsed,
  getMonthsInFiscalYearToDate,
  formatMonth,
  getMonthKey,
} from '../utils/date-utils';

/**
 * Requirement 3: Calculate Year-to-Date Spend
 * Calculates the total YTD spend by summing all spend amounts from fiscal year start to current date
 */
export function calculateYTDSpend(spendData: SpendData[]): number {
  if (!spendData || spendData.length === 0) {
    return 0;
  }

  return spendData.reduce((total, item) => total + item.amount, 0);
}

/**
 * Requirement 4: Calculate Daily Burn Rate By Month
 * Calculates the average daily burn rate for each month of the year
 */
export function calculateMonthlyBurnRates(
  spendData: SpendData[],
  currentDate: Date = new Date()
): MonthlyBurnRate[] {
  if (!spendData || spendData.length === 0) {
    return [];
  }

  const fiscalYear = getFiscalYear(currentDate);
  const months = getMonthsInFiscalYearToDate(currentDate, fiscalYear);
  const monthlyBurnRates: MonthlyBurnRate[] = [];

  // Group spend by month
  const spendByMonth = new Map<string, number>();
  
  spendData.forEach((spend) => {
    const spendDate = parseISO(spend.date);
    const monthKey = getMonthKey(spendDate);
    const currentSpend = spendByMonth.get(monthKey) || 0;
    spendByMonth.set(monthKey, currentSpend + spend.amount);
  });

  // Calculate burn rate for each month
  months.forEach((monthStart) => {
    const monthKey = getMonthKey(monthStart);
    const monthEnd = endOfMonth(monthStart);
    const totalSpend = spendByMonth.get(monthKey) || 0;
    
    // Determine actual days in month (handle partial current month)
    let daysInMonth: number;
    if (monthEnd > currentDate) {
      // Current month - only count days up to current date
      daysInMonth = currentDate.getDate();
    } else {
      // Past months - count all days
      daysInMonth = getDaysInMonth(monthStart);
    }

    const dailyBurnRate = daysInMonth > 0 ? totalSpend / daysInMonth : 0;

    monthlyBurnRates.push({
      month: monthKey,
      monthName: formatMonth(monthStart),
      totalSpend,
      daysInMonth,
      dailyBurnRate,
    });
  });

  return monthlyBurnRates;
}

/**
 * Calculate overall average daily burn rate from YTD spend
 */
export function calculateAverageDailyBurnRate(
  ytdSpend: number,
  currentDate: Date = new Date()
): number {
  const fiscalYear = getFiscalYear(currentDate);
  const daysElapsed = getDaysElapsed(currentDate, fiscalYear);

  if (daysElapsed === 0) {
    return 0;
  }

  return ytdSpend / daysElapsed;
}

/**
 * Requirement 5: Forecast End of Year Spend
 * Forecasts EOY spend by multiplying the burn rate by the total number of days in the fiscal year
 */
export function forecastEOYSpend(
  ytdSpend: number,
  burnRate: number,
  currentDate: Date = new Date()
): number {
  // If burn rate is zero, return YTD spend as the EOY forecast
  if (burnRate === 0) {
    return ytdSpend;
  }

  const fiscalYear = getFiscalYear(currentDate);
  const totalDaysInYear = getDaysInFiscalYear(fiscalYear);

  return burnRate * totalDaysInYear;
}

/**
 * Requirement 6: Compare Forecast Against Budget
 * Calculates variance between forecasted EOY spend and allocated budget
 */
export function calculateBudgetVariance(
  budget: number,
  forecastedEOYSpend: number
): {
  variance: number;
  variancePercentage: number;
  isOverBudget: boolean;
} {
  const variance = forecastedEOYSpend - budget;
  const variancePercentage = budget > 0 ? (variance / budget) * 100 : 0;
  const isOverBudget = variance > 0;

  return {
    variance,
    variancePercentage,
    isOverBudget,
  };
}

/**
 * Complete forecast calculation combining all requirements
 */
export function calculateForecast(
  fleetId: string,
  fleetName: string,
  budget: number,
  spendData: SpendData[],
  currentDate: Date = new Date()
): ForecastResult {
  const fiscalYear = getFiscalYear(currentDate);
  const fiscalYearStart = getFiscalYearStart(fiscalYear);
  const fiscalYearEnd = getFiscalYearEnd(fiscalYear);

  // Requirement 3: Calculate YTD Spend
  const ytdSpend = calculateYTDSpend(spendData);

  // Requirement 4: Calculate Monthly Burn Rates
  const monthlyBurnRates = calculateMonthlyBurnRates(spendData, currentDate);

  // Calculate average daily burn rate
  const avgDailyBurnRate = calculateAverageDailyBurnRate(ytdSpend, currentDate);

  // Requirement 5: Forecast EOY Spend
  const forecastedEOYSpend = forecastEOYSpend(ytdSpend, avgDailyBurnRate, currentDate);

  // Requirement 6: Calculate Budget Variance
  const { variance, variancePercentage, isOverBudget } = calculateBudgetVariance(
    budget,
    forecastedEOYSpend
  );

  return {
    fleetId,
    fleetName,
    budget,
    ytdSpend,
    avgDailyBurnRate,
    monthlyBurnRates,
    forecastedEOYSpend,
    variance,
    variancePercentage,
    isOverBudget,
    fiscalYearStart,
    fiscalYearEnd,
    daysInFiscalYear: getDaysInFiscalYear(fiscalYear),
    daysElapsed: getDaysElapsed(currentDate, fiscalYear),
  };
}

/**
 * Requirement 7: Aggregate Fleet and Sub-Fleet Data
 * Combines data from a fleet and all its sub-fleets
 */
export function aggregateFleetData(
  mainFleet: ForecastResult,
  subFleets: ForecastResult[]
): ForecastResult {
  if (!subFleets || subFleets.length === 0) {
    return { ...mainFleet, subFleets: [] };
  }

  // Aggregate budget
  const totalBudget = mainFleet.budget + subFleets.reduce((sum, sf) => sum + sf.budget, 0);

  // Aggregate YTD spend
  const totalYTDSpend = mainFleet.ytdSpend + subFleets.reduce((sum, sf) => sum + sf.ytdSpend, 0);

  // Recalculate with aggregated data
  const avgDailyBurnRate = calculateAverageDailyBurnRate(totalYTDSpend, new Date());
  const forecastedEOYSpend = forecastEOYSpend(totalYTDSpend, avgDailyBurnRate, new Date());
  const { variance, variancePercentage, isOverBudget } = calculateBudgetVariance(
    totalBudget,
    forecastedEOYSpend
  );

  // Aggregate monthly burn rates
  const monthlyBurnRatesMap = new Map<string, MonthlyBurnRate>();
  
  [mainFleet, ...subFleets].forEach((fleet) => {
    fleet.monthlyBurnRates.forEach((mbr) => {
      const existing = monthlyBurnRatesMap.get(mbr.month);
      if (existing) {
        monthlyBurnRatesMap.set(mbr.month, {
          ...existing,
          totalSpend: existing.totalSpend + mbr.totalSpend,
          dailyBurnRate: existing.dailyBurnRate + mbr.dailyBurnRate,
        });
      } else {
        monthlyBurnRatesMap.set(mbr.month, { ...mbr });
      }
    });
  });

  const monthlyBurnRates = Array.from(monthlyBurnRatesMap.values()).sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  return {
    ...mainFleet,
    budget: totalBudget,
    ytdSpend: totalYTDSpend,
    avgDailyBurnRate,
    monthlyBurnRates,
    forecastedEOYSpend,
    variance,
    variancePercentage,
    isOverBudget,
    subFleets,
  };
}
