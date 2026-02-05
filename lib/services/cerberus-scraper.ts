import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';

/**
 * Cerberus Web Scraper Service
 * Handles web scraping from Cerberus website using Puppeteer
 * 
 * This service manages browser sessions, authentication, and data extraction
 * from the Cerberus web interface.
 */

// Configuration
const BROWSER_SESSION_DIR = path.join(process.cwd(), '.browser-session');
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const PAGE_LOAD_TIMEOUT = 30000; // 30 seconds

// Cerberus selectors - Based on actual page structure and dual-period requirements
const SELECTORS = {
  // Fleet information
  fleetName: 'strong', // "(F6) Planning Automation And Optimization"
  fleetNameIndex: 0, // Use first strong element
  fleetId: '[data-testid="mus-overview-fleetid"]', // "Fleet id: 8304669"
  
  // Period selection (dual-period strategy)
  periodSelectorButton: 'button[data-class-name="mus-period-selector_button"]',
  fullYearButtonText: 'Full Year', // Button text to find Full Year option
  yearToDateButtonText: 'Year to Date', // Button text to find YTD option
  
  // Budget data (IMR Goal) - FROM FULL YEAR VIEW
  budgetElements: '.awsui-key-children',
  imrGoalIndex: 1, // Index 1 = IMR Goal, Index 0 = Estimated Year End
  
  // Spend data (YTD Actual) - FROM YEAR TO DATE VIEW
  spendElements: '.mus-cell-right-aligned',
  ytdSpendIndex: 1, // Index 1 = Total YTD Spend
  
  // Legacy selectors (for compatibility)
  fiscalYear: '.fiscal-year, [data-label="Fiscal Year"]',
  currency: '.currency',
  usageTable: 'table',
  usageTableRows: 'tbody tr',
  spendTable: 'table.spend-table, table',
  spendTableRows: 'tbody tr',
  parentFleet: '.parent-fleet, [data-role="parent-fleet"]',
  subFleetsList: '.sub-fleets-list, [data-role="sub-fleets"]',
  subFleetItem: '.sub-fleet-item, [data-role="sub-fleet"]',
};

// Wait times for period switching
const PERIOD_SELECTION_WAIT = 3000; // 3 seconds for data to reload after period change
const DROPDOWN_OPEN_WAIT = 500; // 500ms for dropdown to appear

// Browser session management
let browser: Browser | null = null;
let sessionStartTime: number = 0;

/**
 * Complete Cerberus data combining budget and spend from dual-period views
 */
export interface CerebusCompleteData {
  fleetId: string;
  fleetName: string;
  fiscalYear: number;
  
  // Budget data (from Full Year view)
  imrGoal: number;
  
  // Spend data (from Year to Date view)
  ytdSpend: number;
  ytdPeriodEnd: Date;
  
  // Calculated metrics
  monthsElapsed: number;
  monthsRemaining: number;
  monthlyBurnRate: number;
  projectedEOY: number;
  variance: number;
  variancePercent: number;
  percentComplete: number;
  isOverBudget: boolean;
}

interface ScrapedBudgetData {
  fleetId: string;
  fleetName: string;
  totalBudget: number;
  fiscalYear: number;
  currency: string;
}

interface ScrapedSpendData {
  date: string;
  amount: number;
  category?: string;
  description?: string;
}

interface ScrapedFleetHierarchy {
  fleetId: string;
  fleetName: string;
  parentFleetId?: string;
  subFleets: string[];
}

/**
 * Initialize browser with persistent session for SSO authentication
 */
export async function initBrowser(headless: boolean = false): Promise<Browser> {
  // Check if existing browser is still valid
  if (browser && Date.now() - sessionStartTime < SESSION_TIMEOUT) {
    try {
      // Test if browser is still connected
      await browser.version();
      return browser;
    } catch (error) {
      // Browser disconnected, create new one
      browser = null;
    }
  }

  // Create session directory if it doesn't exist
  try {
    await fs.access(BROWSER_SESSION_DIR);
  } catch {
    await fs.mkdir(BROWSER_SESSION_DIR, { recursive: true });
  }

  // Launch browser with persistent session
  browser = await puppeteer.launch({
    headless,
    userDataDir: BROWSER_SESSION_DIR,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  });

  sessionStartTime = Date.now();
  return browser;
}

/**
 * Close browser and clean up resources
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    sessionStartTime = 0;
  }
}

/**
 * Create a new page with common settings
 */
async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  
  // Set viewport
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Set timeout
  page.setDefaultTimeout(PAGE_LOAD_TIMEOUT);
  
  // Set user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  
  return page;
}

/**
 * Check if user is logged in to Cerberus
 * Uses Cerberus-specific elements to determine login status
 */
async function isLoggedIn(page: Page, cerberusUrl: string): Promise<boolean> {
  try {
    console.log('🔍 Checking if already logged in...');
    await page.goto(cerberusUrl, { waitUntil: 'networkidle2', timeout: PAGE_LOAD_TIMEOUT });
    
    // Wait a moment for page to fully render
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for Cerberus-specific elements that only appear when logged in
    const cerberusIndicators = [
      'button[data-class-name="mus-period-selector_button"]',  // Period selector button
      '[data-testid="mus-overview-fleetid"]',                  // Fleet ID element
      '.awsui-key-children',                                   // Budget elements
      'strong',                                                 // Fleet name
    ];
    
    // Check if ANY Cerberus element exists
    for (const selector of cerberusIndicators) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`✅ Logged in - found Cerberus element: ${selector}`);
          return true; // Found Cerberus element, we're logged in!
        }
      } catch (err) {
        // Continue checking other selectors
        continue;
      }
    }
    
    // Also check for login form indicators (inverse check)
    const loginIndicators = [
      'input[type="password"]',
      'input[name="username"]',
      'input[name="email"]',
      '.login-form',
      '#login',
    ];
    
    for (const selector of loginIndicators) {
      const element = await page.$(selector);
      if (element) {
        console.log(`⚠️  Not logged in - found login form element: ${selector}`);
        return false; // Found login form, not logged in
      }
    }
    
    // If we found no Cerberus elements and no login form, assume not logged in
    console.log('⚠️  No Cerberus elements or login forms found - assuming not logged in');
    return false;
  } catch (error) {
    console.error('❌ Error checking login status:', error);
    return false;
  }
}

/**
 * Prompt user to login manually
 */
async function promptManualLogin(page: Page, cerberusUrl: string): Promise<void> {
  console.log('\n===========================================');
  console.log('MANUAL LOGIN REQUIRED');
  console.log('===========================================');
  console.log(`\nA browser window has opened to: ${cerberusUrl}`);
  console.log('\nPlease:');
  console.log('1. Complete the SSO authentication');
  console.log('2. Wait for the Cerberus page to fully load');
  console.log('3. Press Enter in this terminal when ready');
  console.log('\nNote: Your session will be saved for future use.');
  console.log('===========================================\n');
  
  // Wait for user to press Enter
  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => {
      resolve();
    });
  });
}

/**
 * Ensure user is authenticated to Cerberus
 */
/**
 * Ensure user is authenticated before scraping
 * Uses session timestamp to avoid repeated login checks
 */
async function ensureAuthenticated(page: Page, cerberusUrl: string): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const sessionDir = path.join(process.cwd(), '.browser-session');
  const timestampFile = path.join(sessionDir, '.last-validated');
  const SESSION_VALIDITY_HOURS = 12; // Assume session valid for 12 hours
  
  try {
    // Check if we have a recent validation timestamp
    const stats = await fs.stat(timestampFile);
    const lastValidated = parseInt(await fs.readFile(timestampFile, 'utf8'));
    const hoursSinceValidation = (Date.now() - lastValidated) / (1000 * 60 * 60);
    
    if (hoursSinceValidation < SESSION_VALIDITY_HOURS) {
      console.log(`✅ Using saved session (validated ${hoursSinceValidation.toFixed(1)}h ago)`);
      return; // Skip login check, use cached session
    } else {
      console.log(`⏰ Session validation expired (${hoursSinceValidation.toFixed(1)}h old), checking login status...`);
    }
  } catch (error) {
    // Timestamp file doesn't exist or can't be read - proceed with login check
    console.log('🔐 First run or no cached session - checking login status...');
  }
  
  // Validate current login status
  const loggedIn = await isLoggedIn(page, cerberusUrl);
  
  if (loggedIn) {
    console.log('✅ Already logged in to Cerberus');
    // Save validation timestamp
    try {
      await fs.mkdir(sessionDir, { recursive: true });
      await fs.writeFile(timestampFile, Date.now().toString());
      console.log('💾 Session validated and cached');
    } catch (err) {
      console.warn('⚠️  Could not save session timestamp:', err);
    }
  } else {
    console.log('🔑 Authentication required...');
    await promptManualLogin(page, cerberusUrl);
    // Save validation timestamp after successful login
    try {
      await fs.mkdir(sessionDir, { recursive: true });
      await fs.writeFile(timestampFile, Date.now().toString());
      console.log('💾 Session authenticated and cached');
    } catch (err) {
      console.warn('⚠️  Could not save session timestamp:', err);
    }
  }
}

/**
 * Extract text content from element using multiple selectors
 */
async function extractText(page: Page, selectors: string): Promise<string | null> {
  const selectorArray = selectors.split(',').map(s => s.trim());
  
  for (const selector of selectorArray) {
    try {
      const element = await page.$(selector);
      if (element) {
        const text = await page.evaluate(el => el.textContent?.trim() || '', element);
        if (text) return text;
      }
    } catch (error) {
      // Try next selector
      continue;
    }
  }
  
  return null;
}

/**
 * Parse currency amount from string
 * Handles formats like: "$1,000,000", "1000000", "$1M", "$2.36MM", "$144.6K", etc.
 */
function parseCurrencyAmount(value: string): number {
  if (!value) return 0;
  
  // Remove currency symbols and whitespace
  let cleaned = value.replace(/[$,\s]/g, '');
  
  // Handle MM (millions) - special case for Cerberus format
  if (cleaned.toUpperCase().endsWith('MM')) {
    cleaned = cleaned.slice(0, -2);
    return parseFloat(cleaned) * 1000000;
  }
  
  // Handle K, M, B suffixes
  const multipliers: { [key: string]: number } = {
    'K': 1000,
    'M': 1000000,
    'B': 1000000000,
  };
  
  const lastChar = cleaned.slice(-1).toUpperCase();
  if (multipliers[lastChar]) {
    cleaned = cleaned.slice(0, -1);
    return parseFloat(cleaned) * multipliers[lastChar];
  }
  
  return parseFloat(cleaned) || 0;
}

/**
 * Parse fiscal year from string
 * Handles formats like: "FY 2026", "2026", "FY26", etc.
 */
function parseFiscalYear(value: string): number {
  if (!value) return new Date().getFullYear();
  
  // Extract 4-digit year
  const match = value.match(/\b(20\d{2}|\d{2})\b/);
  if (match) {
    let year = parseInt(match[1], 10);
    // Convert 2-digit year to 4-digit
    if (year < 100) {
      year += 2000;
    }
    return year;
  }
  
  return new Date().getFullYear();
}

/**
 * Select a specific period view by clicking the appropriate button
 * Supports "Full Year" and "Year to Date" views
 */
async function selectPeriodByText(
  page: Page,
  periodText: 'Full Year' | 'Year to Date'
): Promise<void> {
  try {
    console.log(`   🔄 Selecting "${periodText}" period...`);
    
    // Find all period selector buttons
    const buttons = await page.$$('button[data-class-name="mus-period-selector_button"]');
    
    if (buttons.length === 0) {
      throw new Error('No period selector buttons found');
    }
    
    // Find and click the button with matching text
    let buttonFound = false;
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent?.trim(), button);
      if (text === periodText) {
        await button.click();
        buttonFound = true;
        break;
      }
    }
    
    if (!buttonFound) {
      throw new Error(`Period button "${periodText}" not found. Available buttons: ${
        await Promise.all(buttons.map(b => page.evaluate(el => el.textContent?.trim(), b)))
      }`);
    }
    
    // Wait for data to reload (React/AJAX update - URL doesn't change)
    await new Promise(resolve => setTimeout(resolve, PERIOD_SELECTION_WAIT));
    
    console.log(`   ✅ Selected "${periodText}" period`);
  } catch (error) {
    throw new Error(`Failed to select period "${periodText}": ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Extract IMR Goal from Full Year view
 * Must be called after selecting "Full Year" period
 */
async function extractIMRGoal(page: Page): Promise<number> {
  try {
    const budgetElements = await page.$$('.awsui-key-children');
    
    if (budgetElements.length < 2) {
      throw new Error(`Expected at least 2 .awsui-key-children elements, found ${budgetElements.length}`);
    }
    
    const imrGoalText = await page.evaluate(
      el => el.textContent?.trim() || '',
      budgetElements[SELECTORS.imrGoalIndex]
    );
    
    if (!imrGoalText) {
      throw new Error('IMR Goal text is empty');
    }
    
    const imrGoal = parseCurrencyAmount(imrGoalText);
    
    if (imrGoal === 0) {
      throw new Error(`Failed to parse IMR Goal from text: "${imrGoalText}"`);
    }
    
    console.log(`   ✅ IMR Goal: $${imrGoal.toLocaleString()} (raw: ${imrGoalText})`);
    return imrGoal;
  } catch (error) {
    throw new Error(`Failed to extract IMR Goal: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Extract YTD Actual Spend from Year to Date view
 * Must be called after selecting "Year to Date" period
 */
async function extractYTDSpend(page: Page): Promise<number> {
  try {
    const spendElements = await page.$$('.mus-cell-right-aligned');
    
    if (spendElements.length < 2) {
      throw new Error(`Expected at least 2 .mus-cell-right-aligned elements, found ${spendElements.length}`);
    }
    
    const ytdSpendText = await page.evaluate(
      el => el.textContent?.trim() || '',
      spendElements[SELECTORS.ytdSpendIndex]
    );
    
    if (!ytdSpendText) {
      throw new Error('YTD Spend text is empty');
    }
    
    const ytdSpend = parseCurrencyAmount(ytdSpendText);
    
    if (ytdSpend === 0) {
      console.warn(`   ⚠️  YTD Spend is $0 (raw: "${ytdSpendText}") - verify this is correct`);
    }
    
    console.log(`   ✅ YTD Spend: $${ytdSpend.toLocaleString()} (raw: ${ytdSpendText})`);
    return ytdSpend;
  } catch (error) {
    throw new Error(`Failed to extract YTD Spend: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Calculate months elapsed in fiscal year based on current date
 * Amazon fiscal year: Feb 1 - Jan 31
 * 
 * For reporting: If current month is January (month 1), we're in month 12 of fiscal year
 * Otherwise: reporting month number - 1
 */
function calculateMonthsElapsed(fiscalYear: number): number {
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-12 (January = 1)
  
  // Report is for PREVIOUS month (run on 6th for prior month data)
  // Calculate the reporting month (1-12)
  let reportingMonth = currentMonth - 1;
  
  // Handle January edge case: if current is January, reporting month is December of previous year
  if (reportingMonth === 0) {
    reportingMonth = 12;
  }
  
  // Calculate fiscal months elapsed for the REPORTING month
  // Calendar FY: Jan=1, Feb=2, Mar=3, ..., Dec=12
  // 
  // Since fiscal year = calendar year:
  // - Reporting month IS the fiscal month
  // - January report = 1 month elapsed (end of January)
  // - February report = 2 months elapsed (end of February)
  // - December report = 12 months elapsed (end of year)
  
  return reportingMonth;
}

/**
 * Scrape complete budget and spend data from Cerberus using dual-period strategy
 * This is the main function that orchestrates Full Year + Year to Date scraping
 */
export async function scrapeCerebusComplete(
  fleetId: string,
  cerberusBaseUrl: string
): Promise<CerebusCompleteData> {
  const browser = await initBrowser(false); // Visible browser for SSO
  const page = await createPage(browser);
  
  try {
    // Navigate to fleet page
    const fleetUrl = buildCerberusUrl(cerberusBaseUrl, fleetId);
    console.log(`\n📡 Fleet ${fleetId}: Navigating to Cerberus...`);
    
    await ensureAuthenticated(page, fleetUrl);
    await page.goto(fleetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`✅ Fleet ${fleetId}: Page loaded\n`);
    
    // ===== EXTRACT FROM FULL YEAR VIEW =====
    console.log(`📊 Fleet ${fleetId}: Extracting from Full Year view...`);
    await selectPeriodByText(page, 'Full Year');
    
    // Extract IMR Goal
    const imrGoal = await extractIMRGoal(page);
    
    // Extract fleet metadata (same in both views)
    const fleetNameElements = await page.$$('strong');
    const fleetName = fleetNameElements.length > 0
      ? await page.evaluate(el => el.textContent?.trim() || '', fleetNameElements[0])
      : `Fleet ${fleetId}`;
    
    console.log(`   ✅ Fleet Name: ${fleetName}\n`);
    
    // ===== EXTRACT FROM YEAR TO DATE VIEW =====
    console.log(`📊 Fleet ${fleetId}: Extracting from Year to Date view...`);
    await selectPeriodByText(page, 'Year to Date');
    
    // Extract YTD Spend
    const ytdSpend = await extractYTDSpend(page);
    
    // ===== CALCULATE METRICS =====
    console.log(`\n📈 Fleet ${fleetId}: Calculating forecast metrics...`);
    
    // Determine current fiscal year (Calendar year: Jan 1 - Dec 31)
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12 (January = 1)
    const currentYear = today.getFullYear();
    
    // Fiscal year is simply the calendar year
    const fiscalYear = currentYear;
    
    const monthsElapsed = calculateMonthsElapsed(fiscalYear);
    const monthsRemaining = 12 - monthsElapsed;
    
    // Calculate burn rate and projection
    const monthlyBurnRate = ytdSpend / monthsElapsed;
    const projectedEOY = monthlyBurnRate * 12;
    
    // Calculate variance
    const variance = imrGoal - projectedEOY;
    const variancePercent = (variance / imrGoal) * 100;
    
    // Calculate % of budget used
    const percentComplete = (ytdSpend / imrGoal) * 100;
    
    const isOverBudget = projectedEOY > imrGoal;
    
    console.log(`   Months Elapsed: ${monthsElapsed}/12`);
    console.log(`   Monthly Burn Rate: $${monthlyBurnRate.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
    console.log(`   Projected EOY: $${projectedEOY.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
    console.log(`   Variance: $${variance.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${variancePercent.toFixed(1)}%)`);
    console.log(`   Status: ${isOverBudget ? '⚠️  OVER Budget' : '✅ UNDER Budget'}`);
    
    return {
      fleetId,
      fleetName,
      fiscalYear,
      
      // From Full Year view
      imrGoal,
      
      // From Year to Date view
      ytdSpend,
      ytdPeriodEnd: today,
      
      // Calculated metrics
      monthsElapsed,
      monthsRemaining,
      monthlyBurnRate,
      projectedEOY,
      variance,
      variancePercent,
      percentComplete,
      isOverBudget,
    };
  } catch (error) {
    console.error(`\n❌ Fleet ${fleetId}: Scraping failed -`, error);
    throw error;
  } finally {
    await page.close();
    console.log(`\n✅ Fleet ${fleetId}: Browser page closed\n`);
  }
}

/**
 * Build Cerberus URL with fleet ID and billing period
 */
function buildCerberusUrl(
  cerberusBaseUrl: string,
  fleetId: string,
  billingPeriod?: string
): string {
  // Get current fiscal year billing period (format: YYYY-MM-01)
  const now = new Date();
  const defaultBillingPeriod = billingPeriod || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  
  // Construct URL: /usage?fleetId=X&billingPeriod=Y&activeTab=usage-imr-goal
  const url = new URL('/usage', cerberusBaseUrl);
  url.searchParams.set('fleetId', fleetId);
  url.searchParams.set('billingPeriod', defaultBillingPeriod);
  url.searchParams.set('activeTab', 'usage-imr-goal');
  
  return url.toString();
}

// Export types
export type { ScrapedBudgetData, ScrapedSpendData, ScrapedFleetHierarchy };
