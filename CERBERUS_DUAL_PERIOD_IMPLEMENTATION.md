# Cerberus Dual-Period Web Scraping Implementation

## Overview

The IMR Budget Forecaster requires extracting **two different data points** from Cerberus that are only visible in different period views:

- **IMR Goal** (Annual Budget) → Only visible in **"Full Year"** view
- **YTD Actual Spend** → Only visible in **"Year to Date"** view

This dual-period scraping strategy navigates between these views within a single browser session to collect complete budget data.

## Why Dual-Period Scraping?

Cerberus's UI design presents different metrics depending on the selected time period:

| Period View | IMR Goal Visible? | YTD Spend Visible? |
|-------------|-------------------|---------------------|
| **Full Year** | ✅ Yes (shows annual budget) | ❌ No (shows full year spend instead) |
| **Year to Date** | ❌ No (shows YTD budget instead) | ✅ Yes (shows actual spend to date) |

**Solution**: Navigate to both views sequentially and extract the required data from each.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     scrapeCerebusComplete()                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Launch Puppeteer & Navigate to Fleet Dashboard         │
│  URL: https://cerberus.cloudtune.amazon.dev/fleet/{fleetId}     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Extract Basic Fleet Information                        │
│  - Fleet Name (from <strong> tag)                               │
│  - Fleet ID (from data-testid="mus-overview-fleetid")           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Switch to "Full Year" View                             │
│  - Click period selector button                                 │
│  - Click button with text "Full Year"                           │
│  - Wait 3 seconds for React/AJAX to update DOM                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: Extract IMR Goal                                       │
│  - Query all elements: .awsui-key-children                      │
│  - Extract text from index [1]                                  │
│  - Parse currency: "$2.36MM" → 2360000                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: Switch to "Year to Date" View                          │
│  - Click period selector button                                 │
│  - Click button with text "Year to Date"                        │
│  - Wait 3 seconds for React/AJAX to update DOM                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 6: Extract YTD Spend                                      │
│  - Query all elements: .mus-cell-right-aligned                  │
│  - Extract text from index [1]                                  │
│  - Parse currency: "$150.9K" → 150900                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 7: Calculate Metrics                                      │
│  - Monthly burn rate = YTD Spend / months elapsed               │
│  - Projected EOY = burn rate × 12 months                        │
│  - Variance = Projected EOY - IMR Goal                          │
│  - Percent complete = (current month / 12) × 100                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Return: CerebusCompleteData Object                             │
│  {                                                               │
│    fleetName, fleetId, imrGoal, ytdSpend,                       │
│    monthlyBurnRate, projectedEOY, variance, percentComplete     │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Technical Implementation

### 1. Period Selection Mechanism

**Key Selector**: `button[data-class-name="mus-period-selector_button"]`

```typescript
async function selectPeriodByText(page: Page, periodText: string): Promise<void> {
  // Step 1: Click the period selector button to open dropdown
  const periodSelectorButton = 'button[data-class-name="mus-period-selector_button"]';
  await page.waitForSelector(periodSelectorButton, { timeout: 10000 });
  await page.click(periodSelectorButton);
  
  // Step 2: Wait for dropdown to appear
  await page.waitForTimeout(1000);
  
  // Step 3: Click the specific period button by text
  const buttons = await page.$$('button');
  let clicked = false;
  for (const button of buttons) {
    const text = await page.evaluate(el => el.textContent, button);
    if (text && text.trim() === periodText) {
      await button.click();
      clicked = true;
      break;
    }
  }
  
  if (!clicked) {
    throw new Error(`Period button "${periodText}" not found`);
  }
  
  // Step 4: CRITICAL - Wait for React/AJAX to update DOM
  // URL does NOT change, so we must wait for content to reload
  await page.waitForTimeout(3000);
}
```

**Important Notes**:
- The period selector is a **dropdown menu** that requires two clicks:
  1. Click the selector button to open the menu
  2. Click the desired period option
- **No URL change occurs** when switching periods
- Must wait **3 seconds** after selection for DOM updates
- Period text must match **exactly**: `"Full Year"` or `"Year to Date"`

### 2. Data Extraction - IMR Goal (Full Year View)

**Selector**: `.awsui-key-children` (index **[1]**)

```typescript
async function extractIMRGoal(page: Page): Promise<number> {
  try {
    // Extract all budget-related elements
    const budgetElements = await page.$$('.awsui-key-children');
    
    if (budgetElements.length < 2) {
      console.warn('Not enough budget elements found');
      return 0;
    }
    
    // IMR Goal is always at index [1]
    const imrGoalText = await page.evaluate(
      el => el.textContent?.trim() || '',
      budgetElements[1]
    );
    
    console.log(`Raw IMR Goal text: "${imrGoalText}"`);
    
    // Parse currency format: "$2.36MM" → 2360000
    return parseCurrencyAmount(imrGoalText);
  } catch (error) {
    console.error('Error extracting IMR Goal:', error);
    return 0;
  }
}
```

**DOM Structure** (Full Year View):
```html
<div class="awsui-key-children">$1.5M</div>      <!-- Index [0] - Other metric -->
<div class="awsui-key-children">$2.36MM</div>    <!-- Index [1] - IMR Goal ✅ -->
<div class="awsui-key-children">$500K</div>      <!-- Index [2] - Other metric -->
```

### 3. Data Extraction - YTD Spend (Year to Date View)

**Selector**: `.mus-cell-right-aligned` (index **[1]**)

```typescript
async function extractYTDSpend(page: Page): Promise<number> {
  try {
    // Extract all spend-related elements
    const spendElements = await page.$$('.mus-cell-right-aligned');
    
    if (spendElements.length < 2) {
      console.warn('Not enough spend elements found');
      return 0;
    }
    
    // YTD Spend is always at index [1]
    const ytdSpendText = await page.evaluate(
      el => el.textContent?.trim() || '',
      spendElements[1]
    );
    
    console.log(`Raw YTD Spend text: "${ytdSpendText}"`);
    
    // Parse currency format: "$150.9K" → 150900
    return parseCurrencyAmount(ytdSpendText);
  } catch (error) {
    console.error('Error extracting YTD Spend:', error);
    return 0;
  }
}
```

**DOM Structure** (Year to Date View):
```html
<div class="mus-cell-right-aligned">$50K</div>      <!-- Index [0] - Other metric -->
<div class="mus-cell-right-aligned">$150.9K</div>   <!-- Index [1] - YTD Spend ✅ -->
<div class="mus-cell-right-aligned">$200K</div>     <!-- Index [2] - Other metric -->
```

### 4. Currency Parsing

Handles Amazon's currency format conventions:

```typescript
function parseCurrencyAmount(text: string): number {
  // Remove dollar sign and spaces
  const cleaned = text.replace(/[$\s]/g, '');
  
  // Handle empty or invalid input
  if (!cleaned || cleaned === '-' || cleaned === 'N/A') {
    return 0;
  }
  
  // Extract numeric value and multiplier
  const multipliers: { [key: string]: number } = {
    'K': 1_000,         // $150.9K → 150,900
    'M': 1_000_000,     // $1.5M → 1,500,000
    'MM': 1_000_000,    // $2.36MM → 2,360,000
    'B': 1_000_000_000  // $1.2B → 1,200,000,000
  };
  
  // Find multiplier suffix
  let multiplier = 1;
  let numericPart = cleaned;
  
  for (const [suffix, value] of Object.entries(multipliers)) {
    if (cleaned.endsWith(suffix)) {
      multiplier = value;
      numericPart = cleaned.slice(0, -suffix.length);
      break;
    }
  }
  
  const number = parseFloat(numericPart);
  return isNaN(number) ? 0 : Math.round(number * multiplier);
}
```

**Supported Formats**:
- `$150.9K` → 150,900
- `$1.5M` → 1,500,000
- `$2.36MM` → 2,360,000
- `$1.2B` → 1,200,000,000
- `-` or `N/A` → 0

### 5. Financial Calculations

#### Fiscal Year Context
- **FY2026**: February 1, 2025 → January 31, 2026
- Current implementation assumes FY2026 for date calculations

```typescript
// Calculate months elapsed in fiscal year
const now = new Date();
const fiscalYearStart = new Date(2025, 1, 1); // Feb 1, 2025
const monthsElapsed = (now.getTime() - fiscalYearStart.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
```

#### Monthly Burn Rate
```typescript
const monthlyBurnRate = ytdSpend / monthsElapsed;
```
**Example**: $150,900 ÷ 12 months = $12,575/month

#### Projected End-of-Year Spend
```typescript
const projectedEOY = monthlyBurnRate * 12;
```
**Example**: $12,575/month × 12 = $150,900

#### Variance
```typescript
const variance = projectedEOY - imrGoal;
```
**Example**: $150,900 - $2,360,000 = -$2,209,100 (under budget)

#### Percent Complete
```typescript
const currentMonth = now.getMonth() + 1;
const fiscalMonth = currentMonth >= 2 ? currentMonth - 1 : currentMonth + 11;
const percentComplete = (fiscalMonth / 12) * 100;
```
**Example**: January (month 12 of FY) → 100%

## Data Flow

### Input
```typescript
fleetId: string            // e.g., "8304669"
cerberusBaseUrl: string    // e.g., "https://cerberus.cloudtune.amazon.dev"
```

### Output
```typescript
interface CerebusCompleteData {
  fleetName: string;           // e.g., "IMR-Tuna-Fleet"
  fleetId: string;             // e.g., "8304669"
  imrGoal: number;             // e.g., 2360000 ($2.36MM)
  ytdSpend: number;            // e.g., 150900 ($150.9K)
  monthlyBurnRate: number;     // e.g., 12575 ($12.6K/month)
  projectedEOY: number;        // e.g., 150900 ($150.9K)
  variance: number;            // e.g., -2209100 (-$2.21MM)
  percentComplete: number;     // e.g., 100 (100%)
  lastUpdated: string;         // e.g., "2026-01-31T10:30:00.000Z"
}
```

## Usage Instructions

### Test Single Fleet
```bash
npm run test-cerberus
```

This runs `scripts/test-cerberus-complete.js` which:
1. Tests all 6 production fleet IDs
2. Validates period switching
3. Displays IMR Goal, YTD Spend, and projections
4. Opens browser in headed mode for debugging

### Run Monthly Report
```bash
npm run scrape-monthly-report
```

This runs `scripts/scrape-monthly-report.js` which:
1. Scrapes all 6 fleets sequentially
2. Saves individual JSON files: `reports/YYYY-MM-DD/fleet-{id}.json`
3. Generates console summary table
4. Creates `reports/YYYY-MM-DD/summary-report.txt`
5. Handles errors gracefully with retries

**Expected Duration**: 15-20 seconds per fleet (~2-3 minutes total for 6 fleets)

### View Results
```bash
# List all reports
ls reports/

# View latest report
cat reports/2026-01-31/summary-report.txt

# View individual fleet data
cat reports/2026-01-31/fleet-8304669.json
```

### Integration with Dashboard
```typescript
import { getFleetForecast } from '@/lib/services/cerebus-api';

// Automatically uses scraper if CERBERUS_URL is configured
const forecast = await getFleetForecast('8304669');

// Falls back to mock data if scraping fails
console.log(forecast.imrGoal);      // 2360000
console.log(forecast.ytdSpend);     // 150900
console.log(forecast.projectedEOY); // 150900
```

## Troubleshooting

### Issue: Period button not found
**Error**: `Period button "Full Year" not found`

**Causes**:
1. Period selector button not loading
2. Incorrect button text (case-sensitive)
3. Page not fully loaded

**Solutions**:
```typescript
// Increase wait time before clicking
await page.waitForTimeout(2000);

// Verify button text exactly matches
console.log('Available button texts:', 
  await page.$$eval('button', buttons => 
    buttons.map(b => b.textContent?.trim())
  )
);

// Check if period selector exists
const exists = await page.$('button[data-class-name="mus-period-selector_button"]');
console.log('Period selector exists:', !!exists);
```

### Issue: IMR Goal is $0
**Error**: No error, but `imrGoal: 0` in output

**Causes**:
1. Not in "Full Year" view
2. Selector index changed
3. Element not loaded yet

**Solutions**:
```typescript
// Verify you're in Full Year view
const currentPeriod = await page.$eval(
  'button[data-class-name="mus-period-selector_button"]',
  el => el.textContent?.trim()
);
console.log('Current period:', currentPeriod);

// Check all budget elements
const allBudgets = await page.$$eval('.awsui-key-children', 
  elements => elements.map(el => el.textContent?.trim())
);
console.log('All budget elements:', allBudgets);

// Try different indices
for (let i = 0; i < allBudgets.length; i++) {
  console.log(`Index [${i}]:`, allBudgets[i]);
}
```

### Issue: YTD Spend is $0
**Error**: No error, but `ytdSpend: 0` in output

**Causes**:
1. Not in "Year to Date" view
2. Selector index changed
3. Element not loaded yet

**Solutions**:
```typescript
// Verify you're in Year to Date view
const currentPeriod = await page.$eval(
  'button[data-class-name="mus-period-selector_button"]',
  el => el.textContent?.trim()
);
console.log('Current period:', currentPeriod);

// Check all spend elements
const allSpends = await page.$$eval('.mus-cell-right-aligned', 
  elements => elements.map(el => el.textContent?.trim())
);
console.log('All spend elements:', allSpends);

// Try different indices
for (let i = 0; i < allSpends.length; i++) {
  console.log(`Index [${i}]:`, allSpends[i]);
}
```

### Issue: Scraping timeout
**Error**: `Navigation timeout of 60000 ms exceeded`

**Causes**:
1. SSO authentication required
2. Slow network connection
3. Cerberus server issues

**Solutions**:
```bash
# Manual SSO login first (browser will save session)
npm run test-cerberus

# Check if .browser-session/ exists
ls -la .browser-session/

# Increase timeout in code
await page.goto(url, { 
  waitUntil: 'networkidle2',
  timeout: 120000  // 2 minutes instead of 60 seconds
});
```

### Issue: Currency parsing errors
**Error**: Incorrect monetary values

**Causes**:
1. New currency format not handled
2. Special characters in text

**Solutions**:
```typescript
// Add debug logging
console.log('Raw text:', rawText);
console.log('Cleaned text:', cleaned);
console.log('Parsed amount:', parseCurrencyAmount(rawText));

// Test parsing directly
parseCurrencyAmount('$2.36MM');  // Should return 2360000
parseCurrencyAmount('$150.9K');  // Should return 150900
```

## Maintenance

### When Cerberus UI Changes

If Cerberus updates their UI, you may need to update selectors. Follow these steps:

#### 1. Identify What Changed
```bash
# Run test script to see errors
npm run test-cerberus

# Common error messages:
# - "Period button not found" → Period selector changed
# - "IMR Goal is 0" → Budget element selector changed
# - "YTD Spend is 0" → Spend element selector changed
```

#### 2. Inspect Page in Browser
```bash
# Open Cerberus manually
open https://cerberus.cloudtune.amazon.dev/fleet/8304669

# Open Chrome DevTools (Cmd+Option+I)
# Navigate to Elements tab
# Use selector to find elements:
$$('.awsui-key-children')
$$('.mus-cell-right-aligned')
$$('button[data-class-name="mus-period-selector_button"]')
```

#### 3. Update Selectors in Code

**File**: `lib/services/cerberus-scraper.ts`

```typescript
// Update period selector
const periodSelectorButton = 'button[data-class-name="NEW-SELECTOR"]';

// Update budget elements query
const budgetElements = await page.$$('.NEW-BUDGET-SELECTOR');

// Update spend elements query
const spendElements = await page.$$('.NEW-SPEND-SELECTOR');

// Update element indices if order changed
const imrGoalText = await page.evaluate(
  el => el.textContent?.trim() || '',
  budgetElements[NEW_INDEX]  // Change from [1] to correct index
);
```

#### 4. Update Documentation

After confirming selector changes work:

1. Update this file (CERBERUS_DUAL_PERIOD_IMPLEMENTATION.md)
2. Update `CERBERUS_SELECTORS.md`
3. Update version/date in `TODO.md`

#### 5. Test All Fleets
```bash
# Full test with all 6 fleets
npm run scrape-monthly-report

# Verify all JSON files created
ls reports/$(date +%Y-%m-%d)/

# Check for any $0 values
grep -r '"imrGoal": 0' reports/$(date +%Y-%m-%d)/
grep -r '"ytdSpend": 0' reports/$(date +%Y-%m-%d)/
```

### Version Control for Selectors

Maintain a selector changelog in `CERBERUS_SELECTORS.md`:

```markdown
## Selector Change History

### 2026-01-31 (Current)
- Period selector: `button[data-class-name="mus-period-selector_button"]`
- IMR Goal: `.awsui-key-children[1]`
- YTD Spend: `.mus-cell-right-aligned[1]`

### 2025-12-01 (Deprecated)
- Period selector: `button.period-dropdown`
- IMR Goal: `.budget-value[0]`
- YTD Spend: `.spend-cell[1]`
```

## Performance Considerations

### Timing Breakdown (per fleet)

| Step | Duration | Notes |
|------|----------|-------|
| Page navigation | 2-3s | Initial page load + SSO |
| Extract fleet info | <1s | Static data |
| Switch to Full Year | 4s | Click + 3s wait |
| Extract IMR Goal | <1s | Parse currency |
| Switch to Year to Date | 4s | Click + 3s wait |
| Extract YTD Spend | <1s | Parse currency |
| Calculate metrics | <1s | Simple math |
| **Total** | **~15s** | Per fleet |

### Optimization Options

```typescript
// Option 1: Reduce wait time (risky - may miss data)
await page.waitForTimeout(2000);  // Instead of 3000

// Option 2: Use networkidle0 instead of fixed wait
await page.waitForNavigation({ waitUntil: 'networkidle0' });

// Option 3: Parallel scraping (complex - requires multiple browsers)
const results = await Promise.all(
  fleetIds.map(id => scrapeCerebusComplete(id, baseUrl))
);
```

**Recommendation**: Keep current timing (3-second waits) for reliability. 15-20 seconds per fleet is acceptable for monthly reporting.

### Browser Session Reuse

The scraper reuses browser sessions for efficiency:

```typescript
// Session saved to disk
userDataDir: path.join(process.cwd(), '.browser-session')

// Benefits:
// - SSO login persists across runs
// - Faster subsequent scrapes (no re-authentication)
// - Cookies and local storage preserved
```

**Cleanup**:
```bash
# Clear session if authentication issues occur
rm -rf .browser-session/
```

## Security Considerations

### SSO Authentication
- Requires valid Amazon SSO credentials
- Session stored locally in `.browser-session/`
- **Never commit** `.browser-session/` to git (already in `.gitignore`)

### Sensitive Data
- Fleet IDs are public within Amazon network
- Budget data is confidential - store securely
- Reports contain financial information - restrict access

```bash
# Secure report directory permissions
chmod 700 reports/

# Restrict JSON file access
chmod 600 reports/**/*.json
```

### Environment Variables
```bash
# .env.local (never commit to git)
CERBERUS_URL=https://cerberus.cloudtune.amazon.dev
FLEET_IDS=8304669,8305082,8304674,10089347,8967127,3046715
```

## References

### Related Files
- `lib/services/cerberus-scraper.ts` - Core scraping implementation
- `lib/services/cerebus-api.ts` - API integration layer
- `scripts/test-cerberus-complete.js` - Testing script
- `scripts/scrape-monthly-report.js` - Monthly automation
- `CERBERUS_SELECTORS.md` - Selector quick reference
- `DEPLOYMENT.md` - Production setup guide

### External Resources
- Cerberus Dashboard: https://cerberus.cloudtune.amazon.dev
- Puppeteer Documentation: https://pptr.dev
- Amazon Fiscal Year: FY2026 = Feb 2025 - Jan 2026

---

**Last Updated**: 2026-01-31  
**Maintained By**: IMR Budget Forecaster Team  
**Version**: 1.0.0
