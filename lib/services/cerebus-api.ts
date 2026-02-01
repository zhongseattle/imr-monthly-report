import type { BudgetData, SpendData, CerebrusApiResponse, ApiError, ForecastResult } from '../types';
import { calculateForecast, aggregateFleetData } from './forecast-calculator';
import { validateFiscalYearDate, getFiscalYear } from '../utils/date-utils';

/**
 * Cerebus API Service
 * Handles all interactions with the Cerebus API
 * 
 * Requirements 1 & 2: Retrieve Budget and Spend Data from Cerebus
 */

const CEREBUS_BASE_URL = process.env.NEXT_PUBLIC_CEREBUS_URL || 'https://cerberus.cloudtune.amazon.dev';

/**
 * Mock data generator for development/testing
 * Replace with actual API calls in production
 */
function generateMockData(fleetId: string): CerebrusApiResponse {
  const currentYear = new Date().getFullYear();
  const monthsData: Array<{ date: string; amount: number }> = [];
  
  // Generate mock spend data for each month
  for (let month = 0; month < new Date().getMonth() + 1; month++) {
    const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      // Only generate data up to current day for current month
      if (month === new Date().getMonth() && day > new Date().getDate()) {
        break;
      }
      monthsData.push({
        date: `${currentYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        amount: Math.random() * 1000 + 500, // Random daily spend between $500-$1500
      });
    }
  }

  return {
    budget: {
      total: 500000, // $500K annual budget
      fleetId,
      fleetName: `Fleet ${fleetId}`,
    },
    spend: monthsData.map(data => ({ ...data, fleetId })),
    subFleets: [
      {
        fleetId: `${fleetId}-sub1`,
        fleetName: `Sub-Fleet ${fleetId}-1`,
        budget: 150000,
        spend: monthsData.map(data => ({ ...data, amount: data.amount * 0.3 })),
      },
      {
        fleetId: `${fleetId}-sub2`,
        fleetName: `Sub-Fleet ${fleetId}-2`,
        budget: 100000,
        spend: monthsData.map(data => ({ ...data, amount: data.amount * 0.2 })),
      },
    ],
  };
}

/**
 * Requirement 1: Retrieve Budget Data from Cerebus
 * Fetches budget allocation for a fleet and its sub-fleets
 */
export async function getBudgetData(fleetId: string): Promise<BudgetData> {
  try {
    // TODO: Replace with actual API call
    // const response = await fetch(`${CEREBUS_BASE_URL}/api/budget/${fleetId}`);
    // if (!response.ok) throw new Error(`API returned ${response.status}`);
    // const data = await response.json();
    
    // Using mock data for now
    const mockData = generateMockData(fleetId);
    
    if (!mockData.budget) {
      throw new Error(`No budget data found for fleet ${fleetId}`);
    }

    return {
      fleetId: mockData.budget.fleetId,
      fleetName: mockData.budget.fleetName,
      budget: mockData.budget.total,
      fiscalYear: getFiscalYear(),
    };
  } catch (error) {
    const apiError: ApiError = {
      message: error instanceof Error ? error.message : 'Failed to retrieve budget data from Cerebus',
      code: 'BUDGET_FETCH_ERROR',
    };
    throw apiError;
  }
}

/**
 * Requirement 2: Retrieve Actual Spend Data from Cerebus
 * Fetches actual spend data for a fleet and its sub-fleets from fiscal year start to current date
 */
export async function getSpendData(fleetId: string): Promise<SpendData[]> {
  try {
    // TODO: Replace with actual API call
    // const fiscalYearStart = getFiscalYearStart();
    // const today = new Date();
    // const response = await fetch(
    //   `${CEREBUS_BASE_URL}/api/spend/${fleetId}?start=${fiscalYearStart}&end=${today}`
    // );
    // if (!response.ok) throw new Error(`API returned ${response.status}`);
    // const data = await response.json();
    
    // Using mock data for now
    const mockData = generateMockData(fleetId);
    
    if (!mockData.spend) {
      return []; // Return empty array if no spend data (Requirement 2, AC 5)
    }

    // Validate dates are within fiscal year boundaries (Requirement 8)
    const validatedSpend = mockData.spend.filter((spend) => {
      const spendDate = new Date(spend.date);
      const validation = validateFiscalYearDate(spendDate);
      return validation.isValid;
    });

    return validatedSpend;
  } catch (error) {
    const apiError: ApiError = {
      message: error instanceof Error ? error.message : 'Failed to retrieve spend data from Cerebus',
      code: 'SPEND_FETCH_ERROR',
    };
    throw apiError;
  }
}

/**
 * Requirement 7: Aggregate Fleet and Sub-Fleet Data
 * Retrieves and aggregates data for a fleet including all sub-fleets
 * Now uses real Cerberus scraping with mock data fallback
 */
export async function getFleetForecast(fleetId: string): Promise<ForecastResult> {
  const cerberusUrl = process.env.CERBERUS_URL || CEREBUS_BASE_URL;
  
  // Try real scraper if URL is configured and we're on server-side
  if (typeof window === 'undefined' && cerberusUrl && cerberusUrl !== 'https://cerberus.cloudtune.amazon.dev') {
    try {
      console.log(`\n🔄 Attempting to scrape real Cerberus data for fleet ${fleetId}...`);
      
      // Dynamic import only on server-side when needed
      const { scrapeCerebusComplete } = await import('./cerberus-scraper');
      const scraped = await scrapeCerebusComplete(fleetId, cerberusUrl);
      
      console.log(`✅ Successfully scraped fleet ${fleetId} from Cerberus\n`);
      
      // Transform scraped data using forecast calculator for proper format
      // Create mock spend data from YTD total
      const mockSpendData: SpendData[] = [{
        fleetId: scraped.fleetId,
        date: new Date().toISOString().split('T')[0],
        amount: scraped.ytdSpend / scraped.monthsElapsed, // Spread across months
      }];
      
      return calculateForecast(
        scraped.fleetId,
        scraped.fleetName,
        scraped.imrGoal,
        mockSpendData
      );
    } catch (error) {
      console.error(`⚠️  Scraping failed for fleet ${fleetId}, falling back to mock data:`, error);
      // Fall through to mock data
    }
  } else {
    console.log(`ℹ️  No CERBERUS_URL configured or using default, using mock data for fleet ${fleetId}`);
  }
  
  // Fallback to mock data
  try {
    const mockData = generateMockData(fleetId);
    
    if (!mockData.budget) {
      throw new Error(`Fleet ${fleetId} not found`);
    }

    // Get main fleet forecast
    const mainFleetForecast = calculateForecast(
      mockData.budget.fleetId,
      mockData.budget.fleetName,
      mockData.budget.total,
      mockData.spend || []
    );

    // Get sub-fleet forecasts
    const subFleetForecasts: ForecastResult[] = [];
    if (mockData.subFleets) {
      for (const subFleet of mockData.subFleets) {
        const subFleetForecast = calculateForecast(
          subFleet.fleetId,
          subFleet.fleetName,
          subFleet.budget,
          subFleet.spend.map(s => ({ ...s, fleetId: subFleet.fleetId }))
        );
        subFleetForecasts.push(subFleetForecast);
      }
    }

    // Aggregate all fleet data
    const aggregatedForecast = aggregateFleetData(mainFleetForecast, subFleetForecasts);

    return aggregatedForecast;
  } catch (error) {
    const apiError: ApiError = {
      message: error instanceof Error ? error.message : 'Failed to generate fleet forecast',
      code: 'FORECAST_ERROR',
    };
    throw apiError;
  }
}

/**
 * Health check for Cerebus API
 */
export async function checkCerebrusHealth(): Promise<boolean> {
  try {
    // TODO: Replace with actual API health check
    // const response = await fetch(`${CEREBUS_BASE_URL}/health`);
    // return response.ok;
    return true; // Mock: always healthy
  } catch (error) {
    return false;
  }
}
