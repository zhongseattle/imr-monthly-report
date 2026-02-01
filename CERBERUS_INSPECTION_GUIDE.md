# Cerberus Page Inspection Guide

This guide will help you analyze the Cerberus website structure to determine the correct selectors and data extraction methods for web scraping.

## Prerequisites

Before starting:
- Have access to Cerberus website
- Be logged in via SSO
- Have a known fleet ID ready for testing

## Step 1: Access a Fleet Page

1. **Navigate to Cerberus and locate a fleet page**
   - Use a test fleet ID (e.g., 8304669, 8304670, or any valid fleet)
   - **Please provide the full URL pattern** for accessing a fleet page
   - Example format we need: `https://cerberus.internal.amazon.com/fleet/[FLEET_ID]` or similar

2. **Document the URL pattern:**
   ```
   Base URL: https://cerberus.cloudtune.amazon.dev
   Fleet page pattern: _____________________________
   Example full URL: https://cerberus.cloudtune.amazon.dev/usage?fleetId=8304669&billingPeriod=2026-01-01&activeTab=usage-imr-goal
   ```

## Step 2: Open Browser Developer Tools

1. **Open Chrome/Edge DevTools:**
   - Press `F12` or right-click → "Inspect"
   - Or use `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)

2. **Go to the Elements/Inspector tab**
   - This shows the HTML structure of the page

## Step 3: Identify Budget Data

We need to extract the following budget information:

### 3.1 Fleet Name
1. Look for the fleet name on the page (usually in a header or title)
2. Right-click on the fleet name → "Inspect" 
3. **Document the HTML structure:**
   ```html
   Example:
   <h1 class="fleet-title">Engineering Team Alpha</h1>
   or
   <div data-testid="fleet-name">Engineering Team Alpha</div>
   ```

4. **Record the selector:**
   ```
   Selector type: [class / id / data-attribute / tag]
   Selector value: _________________________________
   Example: .fleet-title or h1.fleet-title
   ```

### 3.2 Total Budget
1. Find where the total budget amount is displayed (e.g., "$1,000,000")
2. Right-click → "Inspect"
3. **Document the HTML structure:**
   ```html
   Example:
   <span class="budget-amount">$1,000,000</span>
   or
   <div class="budget-card">
     <label>Total Budget</label>
     <span class="value">$1,000,000</span>
   </div>
   ```

4. **Record the selector:**
   ```
   Selector: _______________________________________
   Format: [raw number / with $ / with commas]
   ```

### 3.3 Fiscal Year
1. Look for fiscal year information (e.g., "FY 2026")
2. Document its location and format
   ```
   Selector: _______________________________________
   Format example: FY 2026 / 2026 / Feb 2025 - Jan 2026
   ```

### 3.4 Currency
1. Note if currency is explicitly stated or just implied
   ```
   Currency: [USD / $ symbol only / not shown]
   ```

## Step 4: Identify Spend Data

We need to extract spending information, ideally broken down by date/month.

### 4.1 Locate the Spend Section
1. Look for sections showing:
   - Year-to-date (YTD) spend
   - Monthly spending breakdown
   - Spending chart or table
   - Individual transactions

2. **Document what you find:**
   ```
   Spend data location:
   [ ] In a table
   [ ] In a chart/graph
   [ ] In summary cards
   [ ] In a list of transactions
   [ ] Other: _____________________________________
   ```

### 4.2 Monthly/Daily Spend Data

**If spend is shown in a table:**
1. Right-click on the table → "Inspect"
2. Document the table structure:
   ```html
   Example:
   <table class="spend-table">
     <thead>
       <tr><th>Date</th><th>Amount</th><th>Category</th></tr>
     </thead>
     <tbody>
       <tr><td>2025-02-01</td><td>$50,000</td><td>Compute</td></tr>
       <tr><td>2025-02-02</td><td>$45,000</td><td>Storage</td></tr>
     </tbody>
   </table>
   ```

3. **Record selectors:**
   ```
   Table selector: _________________________________
   Row selector: ___________________________________
   Date column: ____________________________________
   Amount column: __________________________________
   ```

**If spend is shown in cards/summary:**
1. Document each metric:
   ```html
   Example:
   <div class="metric-card">
     <h3>YTD Spend</h3>
     <span class="amount">$450,000</span>
   </div>
   ```

2. **Record selectors:**
   ```
   YTD spend selector: _____________________________
   Monthly spend selector: _________________________
   ```

**If spend is shown in a chart:**
1. Check if there's a data table/JSON that feeds the chart
2. In DevTools, go to "Network" tab → Refresh page → Filter by "XHR" or "Fetch"
3. Look for API calls that return spend data in JSON format
4. **Document any JSON endpoints:**
   ```
   Endpoint URL: ___________________________________
   Request method: [GET / POST]
   Parameters needed: ______________________________
   ```

### 4.3 Date Range/Filters
1. Check if there are date pickers or filters
2. Document if you can:
   - Select custom date ranges
   - Filter by fiscal year
   - View specific months
   ```
   Date filters available: _________________________
   Default view: ___________________________________
   ```

## Step 5: Identify Fleet Hierarchy

If the page shows parent/child fleet relationships:

### 5.1 Sub-Fleet Information
1. Look for sections showing:
   - Parent fleet name
   - List of sub-fleets
   - Hierarchy tree/diagram

2. **Document the structure:**
   ```html
   Example:
   <div class="fleet-hierarchy">
     <div class="parent">Parent Fleet</div>
     <ul class="sub-fleets">
       <li>Sub-Fleet 1</li>
       <li>Sub-Fleet 2</li>
     </ul>
   </div>
   ```

3. **Record selectors:**
   ```
   Parent fleet selector: __________________________
   Sub-fleet list selector: ________________________
   Individual sub-fleet selector: __________________
   ```

## Step 6: Check for Dynamic Content

### 6.1 Is data loaded via JavaScript?
1. In DevTools, go to "Network" tab
2. Refresh the page (F5)
3. Look for XHR/Fetch requests that load data **after** page loads

**If you see API calls:**
```
API endpoint: ___________________________________
Response format: [JSON / XML / HTML]
Headers needed: _________________________________
Authentication: _________________________________
```

### 6.2 Does the page use infinite scroll or pagination?
```
[ ] All data loads at once
[ ] Need to scroll to load more
[ ] Need to click "Load More" button
[ ] Has pagination (page 1, 2, 3...)
```

## Step 7: Export a Sample Page

This will help us build accurate selectors:

### Option A: Save Page Source
1. In DevTools, right-click on `<html>` tag → "Copy" → "Copy outerHTML"
2. Save to a text file and share it (remove any sensitive data first)

### Option B: Take Screenshots
1. Take screenshots showing:
   - Full page overview
   - Budget section (with DevTools showing HTML structure)
   - Spend section (with DevTools showing HTML structure)
   - Any tables or data structures

### Option C: Share HTML Snippets
Copy the relevant HTML sections (sanitize sensitive data):
```html
<!-- Budget section -->
<div class="budget-container">
  ...paste here...
</div>

<!-- Spend section -->
<div class="spend-container">
  ...paste here...
</div>
```

## Step 8: Document Findings

Please fill out this summary template:

```markdown
### CERBERUS PAGE STRUCTURE ANALYSIS

#### URLs
- Base URL: 
- Fleet page pattern: 
- Example URL: 

#### Fleet Information
- Fleet Name Selector: 
- Fleet ID Selector: 

#### Budget Data
- Total Budget Selector: 
- Budget Format: 
- Fiscal Year Selector: 
- Currency: 

#### Spend Data
- Spend data is shown as: [table / chart / cards / list]
- Date format: 
- Amount format: 
- Main spend container selector: 
- Individual transaction selectors:
  - Date: 
  - Amount: 
  - Category (if any): 

#### Fleet Hierarchy
- Parent fleet selector: 
- Sub-fleets selector: 
- Hierarchy available: [Yes / No]

#### Dynamic Loading
- Data loaded via JavaScript: [Yes / No]
- API endpoints (if any): 
- Pagination: [Yes / No]
- Infinite scroll: [Yes / No]

#### Additional Notes
- Any special authentication beyond SSO: 
- Rate limiting concerns: 
- Data refresh frequency: 
- Any CAPTCHA or bot detection: 
```

## What to Share Next

After completing this inspection, please share:

1. **The filled-out summary template above**
2. **The example Cerberus URL** for a fleet page
3. **HTML snippets** of the key data sections (sanitized)
4. **Screenshots** (optional but helpful) showing the page structure
5. **Any API endpoints** you discovered in Network tab

With this information, I can build precise scraping functions tailored to Cerberus's actual structure!

## Tips for Success

- **Use unique identifiers**: Look for `data-testid`, `id`, or unique `class` names
- **Avoid generic selectors**: Don't use just `div` or `span` - be specific
- **Check for consistency**: Test selectors on 2-3 different fleet pages
- **Note dynamic content**: If data loads slowly, we'll need wait strategies
- **Watch for changes**: Internal tools may have different layouts for different users/roles

## Next Steps

Once you provide the page structure information:
1. I'll install Puppeteer and set up the scraping framework
2. Create specific scrapers based on your documented selectors
3. Implement session management for SSO authentication
4. Add error handling and retries
5. Test with real fleet data

**Ready to start? Please share the Cerberus URL and begin the inspection!**
