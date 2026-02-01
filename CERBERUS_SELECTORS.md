# Cerberus CSS Selectors Reference

Quick reference guide for all CSS selectors used in Cerberus web scraping.

## Period Selection

### Period Selector Button
```css
button[data-class-name="mus-period-selector_button"]
```

**Location**: Top of dashboard, typically labeled with current period (e.g., "Full Year", "Year to Date")

**Usage**:
```typescript
await page.click('button[data-class-name="mus-period-selector_button"]');
```

**Action**: Opens dropdown menu with period options

---

### Period Option Buttons
```css
button
```

**Filter**: Match by exact text content

**Available Options**:
- `"Full Year"` - Shows annual budget data
- `"Year to Date"` - Shows YTD spend data
- `"Quarter to Date"` - Shows quarterly data (not used)
- `"Month to Date"` - Shows monthly data (not used)

**Usage**:
```typescript
const buttons = await page.$$('button');
for (const button of buttons) {
  const text = await page.evaluate(el => el.textContent, button);
  if (text && text.trim() === 'Full Year') {
    await button.click();
    break;
  }
}
```

## Data Extraction

### Fleet Information

#### Fleet Name
```css
strong
```
**Index**: `[0]` - First `<strong>` element on page

**Example Value**: `"IMR-Tuna-Fleet"`

**Usage**:
```typescript
const fleetName = await page.$eval('strong', el => el.textContent?.trim() || '');
```

---

#### Fleet ID
```css
[data-testid="mus-overview-fleetid"]
```

**Example Value**: `"8304669"`

**Usage**:
```typescript
const fleetId = await page.$eval(
  '[data-testid="mus-overview-fleetid"]',
  el => el.textContent?.trim() || ''
);
```

### Budget Data (Full Year View)

#### IMR Goal (Annual Budget)
```css
.awsui-key-children
```
**Index**: `[1]` - Second element with this class

**Example Value**: `"$2.36MM"`

**Usage**:
```typescript
const budgetElements = await page.$$('.awsui-key-children');
const imrGoalText = await page.evaluate(
  el => el.textContent?.trim() || '',
  budgetElements[1]
);
```

**Important**: 
- Must be in **"Full Year"** period view
- Index `[0]` = Other metric (not IMR Goal)
- Index `[1]` = **IMR Goal** ✅
- Index `[2]` = Other metric (not IMR Goal)

**DOM Structure**:
```html
<div class="awsui-key-children">$1.5M</div>      <!-- [0] -->
<div class="awsui-key-children">$2.36MM</div>    <!-- [1] IMR Goal -->
<div class="awsui-key-children">$500K</div>      <!-- [2] -->
```

### Spend Data (Year to Date View)

#### YTD Actual Spend
```css
.mus-cell-right-aligned
```
**Index**: `[1]` - Second element with this class

**Example Value**: `"$150.9K"`

**Usage**:
```typescript
const spendElements = await page.$$('.mus-cell-right-aligned');
const ytdSpendText = await page.evaluate(
  el => el.textContent?.trim() || '',
  spendElements[1]
);
```

**Important**: 
- Must be in **"Year to Date"** period view
- Index `[0]` = Other metric (not YTD Spend)
- Index `[1]` = **YTD Spend** ✅
- Index `[2]` = Other metric (not YTD Spend)

**DOM Structure**:
```html
<div class="mus-cell-right-aligned">$50K</div>      <!-- [0] -->
<div class="mus-cell-right-aligned">$150.9K</div>   <!-- [1] YTD Spend -->
<div class="mus-cell-right-aligned">$200K</div>     <!-- [2] -->
```

## Selector Testing

### Browser Console Commands

Open Chrome DevTools (Cmd+Option+I) and run these commands in the Console tab:

#### Test Period Selector
```javascript
// Check if period selector exists
document.querySelector('button[data-class-name="mus-period-selector_button"]')

// Get current period text
document.querySelector('button[data-class-name="mus-period-selector_button"]').textContent.trim()
```

#### Test Budget Elements (Full Year View)
```javascript
// Get all budget elements
document.querySelectorAll('.awsui-key-children')

// Extract text from all elements
Array.from(document.querySelectorAll('.awsui-key-children'))
  .map((el, i) => `[${i}]: ${el.textContent.trim()}`)

// Get IMR Goal specifically (index 1)
document.querySelectorAll('.awsui-key-children')[1].textContent.trim()
```

#### Test Spend Elements (Year to Date View)
```javascript
// Get all spend elements
document.querySelectorAll('.mus-cell-right-aligned')

// Extract text from all elements
Array.from(document.querySelectorAll('.mus-cell-right-aligned'))
  .map((el, i) => `[${i}]: ${el.textContent.trim()}`)

// Get YTD Spend specifically (index 1)
document.querySelectorAll('.mus-cell-right-aligned')[1].textContent.trim()
```

#### Test Fleet Information
```javascript
// Get fleet name
document.querySelector('strong').textContent.trim()

// Get fleet ID
document.querySelector('[data-testid="mus-overview-fleetid"]').textContent.trim()
```

## Debugging Selectors

### When Selectors Don't Work

#### 1. Check if element exists
```typescript
const exists = await page.$('YOUR_SELECTOR');
console.log('Element exists:', !!exists);
```

#### 2. Count matching elements
```typescript
const elements = await page.$$('YOUR_SELECTOR');
console.log('Number of elements found:', elements.length);
```

#### 3. Extract all text content
```typescript
const texts = await page.$$eval('YOUR_SELECTOR', 
  elements => elements.map(el => el.textContent?.trim())
);
console.log('All matching text:', texts);
```

#### 4. Verify current period view
```typescript
const currentPeriod = await page.$eval(
  'button[data-class-name="mus-period-selector_button"]',
  el => el.textContent?.trim()
);
console.log('Current period:', currentPeriod);
// Should be "Full Year" or "Year to Date"
```

#### 5. Screenshot for visual debugging
```typescript
await page.screenshot({ 
  path: 'debug-screenshot.png',
  fullPage: true 
});
```

## Selector Stability

### High Stability (Unlikely to Change)
- `[data-testid="mus-overview-fleetid"]` - Uses data-testid attribute
- `button[data-class-name="mus-period-selector_button"]` - Uses data-class-name attribute

### Medium Stability (May Change)
- `.awsui-key-children` - AWS UI library class
- `.mus-cell-right-aligned` - Custom class name

### Low Stability (Frequently Changes)
- `strong` (for fleet name) - Generic HTML tag, relies on order

### Recommendation
Monitor these selectors after Cerberus UI updates and have fallback strategies in place.

## Element Index Mapping

### Full Year View - Budget Elements (`.awsui-key-children`)

| Index | Content | Used For |
|-------|---------|----------|
| `[0]` | Other metric | Not used |
| `[1]` | **IMR Goal** | ✅ Extract this |
| `[2]` | Other metric | Not used |
| `[3+]` | Various metrics | Not used |

### Year to Date View - Spend Elements (`.mus-cell-right-aligned`)

| Index | Content | Used For |
|-------|---------|----------|
| `[0]` | Other metric | Not used |
| `[1]` | **YTD Spend** | ✅ Extract this |
| `[2]` | Other metric | Not used |
| `[3+]` | Various metrics | Not used |

**Critical**: Always verify indices match expected data when debugging.

## Selector Update Checklist

When Cerberus UI changes, follow this checklist:

- [ ] Navigate to Cerberus fleet page manually
- [ ] Open Chrome DevTools (Cmd+Option+I)
- [ ] Switch to "Full Year" view
- [ ] Test budget selector: `$$('.awsui-key-children')`
- [ ] Identify which index contains IMR Goal
- [ ] Switch to "Year to Date" view
- [ ] Test spend selector: `$$('.mus-cell-right-aligned')`
- [ ] Identify which index contains YTD Spend
- [ ] Test period selector button
- [ ] Update selectors in `lib/services/cerberus-scraper.ts`
- [ ] Update this documentation
- [ ] Run full test: `npm run test-cerberus`
- [ ] Verify all 6 fleets scrape correctly

## Common Selector Patterns

### Amazon Web Services UI (AWS UI)
```css
.awsui-*           /* AWS UI component classes */
[data-awsui-*]     /* AWS UI data attributes */
```

### Cerberus Custom Classes
```css
.mus-*             /* Cerberus-specific classes (mus = metric/usage/spend?) */
[data-testid="mus-*"]  /* Cerberus test IDs */
```

### Period-Specific Selectors
```css
/* These selectors may only appear in specific period views */
.awsui-key-children        /* Budget data - Full Year view */
.mus-cell-right-aligned    /* Spend data - Year to Date view */
```

## Puppeteer Selector Methods

### Single Element
```typescript
// Returns first match or null
await page.$('selector')

// Extract text from first match
await page.$eval('selector', el => el.textContent)

// Wait for element to appear
await page.waitForSelector('selector', { timeout: 10000 })
```

### Multiple Elements
```typescript
// Returns array of all matches
await page.$$('selector')

// Extract text from all matches
await page.$$eval('selector', elements => 
  elements.map(el => el.textContent)
)
```

### XPath Alternative
```typescript
// If CSS selectors fail, try XPath
await page.$x('//button[contains(text(), "Full Year")]')
```

## Performance Notes

### Efficient Selector Patterns
```typescript
// ✅ Good - Specific and fast
await page.$('[data-testid="mus-overview-fleetid"]')

// ✅ Good - Attribute selector with class
await page.$('button[data-class-name="mus-period-selector_button"]')

// ⚠️ Okay - Class selector (common)
await page.$$('.awsui-key-children')

// ❌ Slow - Generic tag (requires indexing)
await page.$('strong')
```

### Caching Strategies
```typescript
// Extract all elements once, reuse array
const budgetElements = await page.$$('.awsui-key-children');
const imrGoal = await page.evaluate(el => el.textContent, budgetElements[1]);
const otherData = await page.evaluate(el => el.textContent, budgetElements[2]);

// vs. querying multiple times (slower)
const imrGoal = await page.$eval('.awsui-key-children:nth-child(2)', el => el.textContent);
const otherData = await page.$eval('.awsui-key-children:nth-child(3)', el => el.textContent);
```

## Version History

### Current Version (2026-01-31)
```typescript
// Period selector
'button[data-class-name="mus-period-selector_button"]'

// Fleet info
'strong'  // Index [0] for fleet name
'[data-testid="mus-overview-fleetid"]'  // Fleet ID

// Budget data (Full Year)
'.awsui-key-children'  // Index [1] for IMR Goal

// Spend data (Year to Date)
'.mus-cell-right-aligned'  // Index [1] for YTD Spend
```

### Change Log
- **2026-01-31**: Initial documentation
- Future changes will be logged here

## Related Files
- `lib/services/cerberus-scraper.ts` - Implementation
- `CERBERUS_DUAL_PERIOD_IMPLEMENTATION.md` - Full technical guide
- `scripts/test-cerberus-complete.js` - Testing script

---

**Last Updated**: 2026-01-31  
**Maintained By**: IMR Budget Forecaster Team
