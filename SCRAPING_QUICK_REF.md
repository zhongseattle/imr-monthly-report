# Cerberus Web Scraping - Quick Reference

## Setup (One-time)

```bash
# 1. Configure Cerberus URL
cp .env.scraper.example .env.local
# Edit .env.local with your actual Cerberus URL

# 2. Authenticate (opens browser for SSO login)
npm run test-scraper test-auth
```

## Find Selectors

```bash
# Extract page HTML for analysis
npm run test-scraper extract-html

# OR take a screenshot
npm run test-scraper screenshot
```

Results saved to `debug/` directory.

## Update Selectors

Edit `lib/services/cerberus-scraper.ts`:

```typescript
const SELECTORS = {
  fleetName: 'YOUR_SELECTOR_HERE',
  totalBudget: 'YOUR_SELECTOR_HERE',
  spendTable: 'YOUR_SELECTOR_HERE',
  // ...
};
```

## Test Scraping

```bash
# Test budget scraping
npm run test-scraper test-budget

# Test spend scraping
npm run test-scraper test-spend

# Test everything
npm run test-scraper test-all
```

## Common Selectors

### By Class
```css
.budget-amount
.spend-table
```

### By ID
```css
#total-budget
#fleet-name
```

### By Data Attribute
```css
[data-testid="budget"]
[data-label="Total Budget"]
```

### By Nested Structure
```css
.budget-card .value
table.spend tbody tr
```

### By Position
```css
td:nth-child(1)    /* First column */
td:nth-child(2)    /* Second column */
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Could not find element" | Update selector in `cerberus-scraper.ts` |
| "Authentication failed" | Run `npm run test-scraper test-auth` |
| "Timeout" | Increase `SCRAPER_TIMEOUT` in `.env.local` |
| Empty data | Check if element loads dynamically |
| Session expired | Delete `.browser-session/` and re-auth |

## Environment Variables

```bash
CERBERUS_URL=https://your-cerberus-url.com
TEST_FLEET_ID=your_fleet_id
SCRAPER_HEADLESS=false  # true for production
SCRAPER_TIMEOUT=30000   # milliseconds
```

## Files to Know

| File | Purpose |
|------|---------|
| `SCRAPING_SETUP.md` | Detailed setup guide |
| `CERBERUS_INSPECTION_GUIDE.md` | How to find selectors |
| `lib/services/cerberus-scraper.ts` | Scraper implementation |
| `scripts/test-scraper.js` | Test utility |
| `.env.local` | Configuration (not in git) |
| `.browser-session/` | Saved SSO session (not in git) |

## Next Steps

1. Share your actual Cerberus URL
2. Run authentication test
3. Extract HTML/screenshot
4. Find selectors using inspection guide
5. Update selectors in scraper
6. Test with your fleet IDs
7. Integrate with application

**Questions? Check `SCRAPING_SETUP.md` for detailed instructions!**
