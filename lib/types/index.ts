// Type definitions for IMR Budget Forecaster

export interface Fleet {
  id: string;
  name: string;
  parentFleetId?: string;
}

export interface BudgetData {
  fleetId: string;
  fleetName: string;
  budget: number;
  fiscalYear: number;
}

export interface SpendData {
  fleetId: string;
  date: string;
  amount: number;
}

export interface MonthlyBurnRate {
  month: string; // YYYY-MM format
  monthName: string; // e.g., "January 2026"
  totalSpend: number;
  daysInMonth: number;
  dailyBurnRate: number;
}

export interface ForecastResult {
  fleetId: string;
  fleetName: string;
  budget: number;
  ytdSpend: number;
  avgDailyBurnRate: number;
  monthlyBurnRates: MonthlyBurnRate[];
  forecastedEOYSpend: number;
  variance: number;
  variancePercentage: number;
  isOverBudget: boolean;
  fiscalYearStart: Date;
  fiscalYearEnd: Date;
  daysInFiscalYear: number;
  daysElapsed: number;
  subFleets?: ForecastResult[];
}

export interface CerebrusApiResponse {
  budget?: {
    total: number;
    fleetId: string;
    fleetName: string;
  };
  spend?: Array<{
    date: string;
    amount: number;
    fleetId: string;
  }>;
  subFleets?: Array<{
    fleetId: string;
    fleetName: string;
    budget: number;
    spend: Array<{
      date: string;
      amount: number;
    }>;
  }>;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}
