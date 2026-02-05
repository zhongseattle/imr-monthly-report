import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { ForecastResult } from '@/lib/types';

/**
 * API Route to get fleet forecast data
 * Reads from scraped reports if available, falls back to mock data
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fleetId = searchParams.get('id');

  if (!fleetId) {
    return NextResponse.json(
      { error: 'Fleet ID is required' },
      { status: 400 }
    );
  }

  try {
    // Try to find the most recent report for this fleet
    const reportsDir = path.join(process.cwd(), 'reports');
    
    // Get all report directories, sorted by date (newest first)
    const reportDirs = await fs.readdir(reportsDir);
    const sortedDirs = reportDirs
      .filter(dir => dir.match(/^\d{4}-\d{2}-\d{2}$/))
      .sort()
      .reverse();

    // Try to find fleet data in the most recent reports
    for (const dir of sortedDirs) {
      const fleetFile = path.join(reportsDir, dir, `fleet-${fleetId}.json`);
      
      try {
        const fileContent = await fs.readFile(fleetFile, 'utf-8');
        const scrapedData = JSON.parse(fileContent);
        
        // Transform scraped data to ForecastResult format
        const forecast: ForecastResult = {
          fleetId: scrapedData.fleetId,
          fleetName: scrapedData.fleetName,
          budget: scrapedData.imrGoal,
          ytdSpend: scrapedData.ytdSpend,
          forecastedEOYSpend: scrapedData.projectedEOY,
          variance: scrapedData.variance,
          variancePercentage: scrapedData.variancePercent,
          isOverBudget: scrapedData.isOverBudget,
          avgDailyBurnRate: scrapedData.monthlyBurnRate / 30, // Approximate
          fiscalYearStart: new Date(`${scrapedData.fiscalYear}-01-01`),
          fiscalYearEnd: new Date(`${scrapedData.fiscalYear}-12-31`),
          daysElapsed: scrapedData.monthsElapsed * 30, // Approximate
          monthlyBurnRates: generateMonthlyData(scrapedData),
          subFleets: [],
        };

        return NextResponse.json(forecast);
      } catch (error) {
        // File not found, try next directory
        continue;
      }
    }

    // No scraped data found, return error
    return NextResponse.json(
      {
        error: `No scraped data found for fleet ${fleetId}. Run 'npm run scrape-monthly-report' first.`,
        fleetId,
      },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error reading fleet data:', error);
    return NextResponse.json(
      { error: 'Failed to load fleet data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Generate monthly breakdown data from scraped totals
 * Since we only have YTD totals, we'll create a simple distribution
 */
function generateMonthlyData(scrapedData: any) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  const monthlyBurnRates = [];
  const monthlySpend = scrapedData.ytdSpend / scrapedData.monthsElapsed;
  
  // Generate data for months elapsed
  for (let i = 0; i < scrapedData.monthsElapsed && i < 12; i++) {
    const monthName = `${months[i]} ${scrapedData.fiscalYear}`;
    const daysInMonth = new Date(scrapedData.fiscalYear, i + 1, 0).getDate();
    
    monthlyBurnRates.push({
      month: i + 1,
      monthName,
      totalSpend: monthlySpend,
      daysInMonth,
      dailyBurnRate: monthlySpend / daysInMonth,
    });
  }
  
  // Fill remaining months with zeros
  for (let i = scrapedData.monthsElapsed; i < 12; i++) {
    const monthName = `${months[i]} ${scrapedData.fiscalYear}`;
    const daysInMonth = new Date(scrapedData.fiscalYear, i + 1, 0).getDate();
    
    monthlyBurnRates.push({
      month: i + 1,
      monthName,
      totalSpend: 0,
      daysInMonth,
      dailyBurnRate: 0,
    });
  }
  
  return monthlyBurnRates;
}
