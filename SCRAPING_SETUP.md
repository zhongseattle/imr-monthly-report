# Cerberus Web Scraping Setup Guide

This guide will help you set up and configure web scraping for the Cerberus website.

## Current Implementation Status

**Status**: ✅ **PRODUCTION READY**

The scraper is fully implemented and tested with:
- **Dual-period extraction strategy** (Full Year + Year to Date views)
- **6 production fleets** configured and tested
- **Monthly automation** with report generation
- **SSO authentication** with session persistence

For the current production implementation, see:
- `CERBERUS_DUAL_PERIOD_IMPLEMENTATION.md` - Complete technical guide
- `CERBERUS_SELECTORS.md` - Selector reference
- `DEPLOYMENT.md` - Production setup and automation

The sections below describe the original setup process and general scraping concepts.

---

## Dual-Period Scraping Strategy

The production implementation uses a **dual-period approach** because Cerberus displays different metrics depending on the selected time period:

### Why Two Period Views?

| Period View | IMR Goal Visible? | YTD Spend Visible? |
|-------------|-------------------|---------------------|
| **Full Year** | ✅ Yes (annual budget) | ❌ No |
| **Year to Date** | ❌ No | ✅ Yes (actual spend to date) |

### Solution

The scraper:
1. Navigates to **"Full Year"** view → Extracts IMR Goal
2. Switches to **"Year to Date"** view → Extracts YTD Spend
3. Combines data and calculates metrics (burn rate, projected EOY, variance)

### Key Technical Details

**Period Switching**:
- Selector: `button[data-class-name="mus-period-selector_button"]`
- No URL change occurs (React/AJAX updates)
- Must wait 3 seconds after period selection for DOM to update

**Data Extraction**:
- IMR Goal: `.awsui-key-children[1]` (Full Year view)
- YTD Spend: `.mus-cell-right-aligned[1]` (Year to Date view)

**Currency Parsing**:
- Handles: `$2.36MM`, `$150.9K`, `$1.5M`, `$1.2B`
- Converts to numbers: 2360000, 150900, 1500000, 1200000000

### Running Production Scripts

```bash
# Test all 6 production fleets (opens browser for debugging)
npm run test-cerberus

# Generate monthly report (saves JSON + summary)
npm run scrape-monthly-report
```

See `DEPLOYMENT.md` for detailed production setup and automation instructions.

---

## Quick Start

### Step 1: Install Dependencies

Dependencies are already installed (Puppeteer). If needed:
```bash
npm install
```

### Step 2: Configure Cerberus URL

1. Copy the environment template:
```bash
cp .env.scraper.example .env.local
```

2. Edit `.env.local` and set your Cerberus URL:
```bash
CERBERUS_URL=https://your-actual-cerberus-url.amazon.com
TEST_FLEET_ID=your_test_fleet_id
```

### Step 3: Test Authentication

Run the test utility to authenticate with SSO:
```bash
npm run test-scraper test-auth
```

This will:
- Open a browser window to Cerberus
- Prompt you to complete SSO login
- Save your session for future use

**Once authenticated, your session persists!** You won't need to log in again for 30 minutes.

### Step 4: Analyze Page Structure

Follow the **CERBERUS_INSPECTION_GUIDE.md** to find the correct CSS selectors, OR use our automated tools:

#### Option A: Extract HTML for Analysis
```bash
npm run test-scraper extract-html
```

This saves the page HTML to `debug/fleet-[ID]-page.html` which you can inspect.

#### Option B: Take a Screenshot
```bash
npm run test-scraper screenshot
```

This saves a full-page screenshot to `debug/fleet-[ID]-screenshot.png`.

### Step 5: Update Selectors

Edit `lib/services/cerberus-scraper.ts` and update the `SELECTORS` object with the correct CSS selectors you found:

```typescript
const SELECTORS = {
  // Update these based on your analysis
  fleetName: 'h1.your-actual-fleet-title-class',
  totalBudget: '.your-actual-budget-class',
  spendTable: 'table.your-actual-table-class',
  // ... etc
};
```

### Step 6: Test Individual Scrapers

Test each scraping function:

```bash
# Test budget scraping
npm run test-scraper test-budget

# Test spend scraping
npm run test-scraper test-spend

# Test fleet hierarchy
npm run test-scraper test-hierarchy

# Or test everything at once
npm run test-scraper test-all
```

### Step 7: Integrate with Application

Once scraping works, the application will automatically use it instead of mock data.

---

## Available Test Commands

| Command | Description |
|---------|-------------|
| `test-auth` | Test SSO authentication and save session |
| `screenshot` | Take a screenshot of the fleet page |
| `extract-html` | Extract and save page HTML for analysis |
| `test-budget` | Test scraping budget data |
| `test-spend` | Test scraping spend data |
| `test-hierarchy` | Test scraping fleet hierarchy |
| `test-all` | Run all tests in sequence |

### Examples

```bash
# Use a different fleet ID
TEST_FLEET_ID=8304670 npm run test-scraper test-budget

# Use a different Cerberus URL
CERBERUS_URL=https://cerberus.beta.amazon.com npm run test-scraper screenshot

# Combine both
CERBERUS_URL=https://cerberus.prod.amazon.com TEST_FLEET_ID=1234567 npm run test-scraper test-all
```

---

## How It Works

### Browser Session Management

The scraper uses Puppeteer with persistent browser sessions:

1. **First run**: Browser opens, you log in via SSO manually
2. **Session saved**: Login cookies are saved to `.browser-session/` directory
3. **Future runs**: Browser uses saved session, no login needed
4. **Auto-refresh**: Session automatically refreshes every 30 minutes

### Manual SSO Login Flow

```
┌─────────────────────────────────────────────────────┐
│  1. Script launches browser                         │
│  2. Navigates to Cerberus URL                       │
│  3. Detects if login page appears                   │
│  4. If not logged in:                               │
│     - Pauses script execution                       │
│     - Prompts you to log in manually               │
│     - Waits for you to press Enter                 │
│  5. Once logged in, session is saved               │
│  6. Script continues with scraping                 │
└─────────────────────────────────────────────────────┘
```

### Data Extraction Process

```
┌─────────────────────────────────────────────────────┐
│  1. Navigate to fleet page                          │
│  2. Wait for page to fully load                     │
│  3. Find elements using CSS selectors               │
│  4. Extract text content                            │
│  5. Parse and clean data                            │
│  6. Return structured data                          │
└─────────────────────────────────────────────────────┘
```

---

## Updating Selectors

The most important step is finding the correct CSS selectors. Here's how:

### 1. Using Browser DevTools

1. Open Cerberus in your browser
2. Navigate to a fleet page
3. Right-click on the data element → "Inspect"
4. Note the HTML structure and class names

### 2. Finding the Budget Amount

Look for patterns like:
```html
<!-- Option 1: Direct class -->
<span class="budget-value">$1,000,000</span>
Selector: .budget-value

<!-- Option 2: Nested structure -->
<div class="budget-card">
  <label>Total Budget</label>
  <span class="value">$1,000,000</span>
</div>
Selector: .budget-card .value

<!-- Option 3: Data attribute -->
<td data-label="Total Budget">1000000</td>
Selector: [data-label="Total Budget"]
```

### 3. Finding Spend Data

Spend data is usually in a table:
```html
<table class="spend-table">
  <thead>
    <tr>
      <th>Date</th>
      <th>Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>2025-02-01</td>
      <td>$50,000</td>
    </tr>
  </tbody>
</table>

Selectors:
- Table: .spend-table
- Rows: tbody tr
- Date column: td:nth-child(1)
- Amount column: td:nth-child(2)
```

### 4. Testing Selectors

Use the test utility to verify selectors work:
```bash
npm run test-scraper test-budget
```

If you see an error like:
```
❌ Could not find budget amount on page. Selector: .budget-amount
```

Then:
1. Run `npm run test-scraper extract-html`
2. Open `debug/fleet-[ID]-page.html`
3. Find the correct selector
4. Update `cerberus-scraper.ts`
5. Test again

---

## Troubleshooting

### Issue: "Could not find element on page"

**Solution**: The selector is wrong or the element loads dynamically.

1. Take a screenshot: `npm run test-scraper screenshot`
2. Extract HTML: `npm run test-scraper extract-html`
3. Find the correct selector in the HTML
4. Update `SELECTORS` in `cerberus-scraper.ts`

### Issue: "Authentication failed" or "Login required"

**Solution**: Session expired or SSO needs re-authentication.

1. Delete the session directory: `rm -rf .browser-session`
2. Run `npm run test-scraper test-auth` again
3. Complete SSO login manually

### Issue: "Timeout waiting for page"

**Solution**: Page is slow or requires longer timeout.

1. Increase timeout in `.env.local`:
   ```
   SCRAPER_TIMEOUT=60000
   ```
2. Check if page has loading spinners or lazy-loaded content
3. Add wait conditions in scraper

### Issue: Extracted data is empty or null

**Solution**: Element exists but is empty, or wrong selector.

1. Check if data is loaded via JavaScript/AJAX
2. Look for API calls in Network tab
3. May need to wait longer or trigger actions (clicks, scrolls)

### Issue: "Browser disconnected"

**Solution**: Browser crashed or was closed manually.

1. Restart the test: `npm run test-scraper test-auth`
2. Check system resources (RAM, CPU)
3. Try headless mode: `SCRAPER_HEADLESS=true npm run test-scraper test-budget`

---

## Advanced Configuration

### Headless Mode

By default, the browser opens visibly so you can see what's happening. For production:

```bash
# In .env.local
SCRAPER_HEADLESS=true
```

### Custom Timeouts

```bash
# In .env.local
SCRAPER_TIMEOUT=60000          # Page load timeout (ms)
SCRAPER_SESSION_TIMEOUT=3600000 # Session validity (ms)
```

### Debug Mode

Enable verbose logging:
```bash
# In .env.local
DEBUG_SCRAPER=true
```

### Multiple Cerberus Environments

```bash
# Development
CERBERUS_URL=https://cerberus.dev.amazon.com

# Beta
CERBERUS_URL=https://cerberus.beta.amazon.com

# Production
CERBERUS_URL=https://cerberus.prod.amazon.com
```

---

## Integration with Application

Once scraping is configured and working:

### Option 1: Keep Mock Data as Fallback

The application can use scraping for real data and fall back to mocks on error.

### Option 2: Replace Mock Data Completely

Update `lib/services/cerebus-api.ts` to use the scraper:

```typescript
import { scrapeBudgetData, scrapeSpendData } from './cerberus-scraper';

export async function getBudgetData(fleetId: string): Promise<BudgetData> {
  const cerberusUrl = process.env.CERBERUS_URL || '';
  const scraped = await scrapeBudgetData(fleetId, cerberusUrl);
  
  return {
    fleetId: scraped.fleetId,
    fleetName: scraped.fleetName,
    budget: scraped.totalBudget,
    fiscalYear: scraped.fiscalYear,
  };
}
```

---

## Best Practices

### 1. Test with Multiple Fleets

Don't just test with one fleet ID. Test with 2-3 different fleets to ensure selectors work universally.

### 2. Handle Missing Data Gracefully

Not all fleets may have complete data. Add fallbacks:
```typescript
const budget = await extractText(page, SELECTORS.totalBudget) || '0';
```

### 3. Keep Session Fresh

The scraper automatically refreshes sessions, but for long-running processes, consider:
- Re-authenticating periodically
- Handling session expiration errors

### 4. Rate Limiting

Be respectful of Cerberus servers:
- Add delays between requests
- Don't scrape too frequently
- Consider caching results

### 5. Monitor Changes

Websites change. If scraping breaks:
- Check if Cerberus UI was updated
- Update selectors accordingly
- Keep backup HTML samples for reference

---

## Security Considerations

### 1. Session Files

The `.browser-session/` directory contains your authenticated session:
- **DO NOT** commit this directory to git (already in `.gitignore`)
- Protect it like you would protect login credentials
- Delete it when switching accounts

### 2. Credentials

- Never hardcode passwords or API keys
- Use environment variables only
- Rotate credentials regularly

### 3. Data Sensitivity

- Budget and spend data may be confidential
- Don't log sensitive data
- Sanitize data before sharing screenshots/HTML

---

## Next Steps

1. ✅ Install dependencies
2. ⏳ Configure Cerberus URL (provide the real URL)
3. ⏳ Test authentication
4. ⏳ Analyze page structure
5. ⏳ Update selectors
6. ⏳ Test scrapers
7. ⏳ Integrate with application
8. ⏳ Deploy

**Current Status**: Infrastructure ready, waiting for your Cerberus URL and page analysis.

---

## Getting Help

1. **Inspection Guide**: See `CERBERUS_INSPECTION_GUIDE.md` for detailed page analysis steps
2. **Test Utility**: Run `npm run test-scraper help` for command reference
3. **Scraper Code**: Check `lib/services/cerberus-scraper.ts` for implementation details
4. **Examples**: Test with mock fleet IDs first to understand the flow

**Ready to proceed? Share your Cerberus URL and let's test it!**
