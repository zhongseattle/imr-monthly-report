# Monthly Execution Checklist

**Purpose**: Generate monthly budget reports for all 6 IMR fleets  
**Schedule**: Run on the **6th of each month** at 8:00 AM  
**Duration**: Approximately 2-3 minutes for all fleets

---

## Pre-Execution Checklist

### Environment Verification
- [ ] Connected to Amazon VPN (if working remotely)
- [ ] `.env.local` file configured with correct fleet IDs
- [ ] `.browser-session/` directory exists (SSO session saved)
- [ ] `reports/` directory exists or can be created
- [ ] Sufficient disk space available (>100MB)

### System Check
```bash
# Navigate to project directory
cd /Users/zhongsea/imr-budget-forecaster

# Verify Node.js version (should be v18.20.2 or higher)
node --version

# Verify dependencies installed
npm list puppeteer | head -1

# Check environment variables
cat .env.local | grep CERBERUS_URL
cat .env.local | grep FLEET_IDS
```

**Expected Output**:
```
v18.20.2 (or higher)
puppeteer@24.36.1
CERBERUS_URL=https://cerberus.cloudtune.amazon.dev
FLEET_IDS=8304669,8305082,8304674,10089347,8967127,3046715
```

---

## Execution Steps

### Step 1: Update Code (if needed)
```bash
# Pull latest changes from repository
git pull origin main

# Review what changed
git log --oneline -5

# Install/update dependencies if package.json changed
npm install
```

### Step 2: Test SSO Session
```bash
# Quick test to verify session is still valid
# If browser opens and shows login page, complete SSO authentication
npm run test-cerberus
```

**Action Required**:
- If SSO login page appears, complete authentication
- Session will be saved for future runs
- Press Ctrl+C after verifying first fleet loads successfully

### Step 3: Run Monthly Report
```bash
# Generate reports for all 6 fleets
npm run scrape-monthly-report
```

**Expected Console Output**:
```
╔═══════════════════════════════════════════════════════════════╗
║                MONTHLY CERBERUS REPORT                         ║
╚═══════════════════════════════════════════════════════════════╝

📅 Report Date: 2026-02-06
📊 Report Period: February 2026
🏢 Fleets to Process: 6
🌐 Cerberus URL: https://cerberus.cloudtune.amazon.dev

[1/6] Processing Fleet 8304669...
✅ Fleet 8304669: IMR-Tuna-Fleet (15.2s)
   IMR Goal: $2,360,000
   YTD Spend: $150,900

[2/6] Processing Fleet 8305082...
...
(continues for all 6 fleets)
...

✅ All reports generated successfully!
📁 Reports saved to: reports/2026-02-06/
```

**Duration**: 2-3 minutes for all 6 fleets

### Step 4: Verify Report Generation
```bash
# Check today's report directory
TODAY=$(date +%Y-%m-%d)
ls -lh reports/$TODAY/

# Expected files (7 total):
# - 6 JSON files (one per fleet)
# - 1 summary text file
```

**Expected Output**:
```
fleet-8304669.json         (3-5 KB)
fleet-8305082.json         (3-5 KB)
fleet-8304674.json         (3-5 KB)
fleet-10089347.json        (3-5 KB)
fleet-8967127.json         (3-5 KB)
fleet-3046715.json         (3-5 KB)
summary-report.txt         (2-3 KB)
```

### Step 5: Review Summary Report
```bash
# View summary report
cat reports/$TODAY/summary-report.txt
```

**Expected Format**:
```
═══════════════════════════════════════════════════════════════
              CERBERUS MONTHLY BUDGET REPORT
                     February 06, 2026
═══════════════════════════════════════════════════════════════

Fleet 8304669 - IMR-Tuna-Fleet
─────────────────────────────────────────────────────────────
IMR Goal (Budget):        $2,360,000
YTD Spend:                  $150,900
Monthly Burn Rate:           $12,575
Projected EOY:              $150,900
Variance:                -$2,209,100 (-93.6%)
Status: ✅ UNDER Budget

(... continues for all 6 fleets ...)
```

### Step 6: Data Validation
Spot-check 1-2 fleets by manually comparing with Cerberus:

```bash
# Open Cerberus for manual verification
open https://cerberus.cloudtune.amazon.dev/fleet/8304669

# Compare with scraped data
cat reports/$TODAY/fleet-8304669.json | jq '{imrGoal, ytdSpend, projectedEOY}'
```

**Validation Checklist**:
- [ ] IMR Goal matches Cerberus "Full Year" view
- [ ] YTD Spend matches Cerberus "Year to Date" view
- [ ] No $0 values (indicates scraping error)
- [ ] Variance calculation is correct
- [ ] Fleet names are correct

---

## Post-Execution Tasks

### Archive & Share
```bash
# Create compressed archive (optional)
tar -czf reports-$TODAY.tar.gz reports/$TODAY/

# Share via email/Slack (optional)
# attach reports/$TODAY/summary-report.txt
```

### Log Execution
```bash
# Log successful run
echo "$(date): Monthly report completed successfully" >> logs/monthly-runs.log

# Or create log file if it doesn't exist
mkdir -p logs
echo "$(date): Monthly report completed successfully" >> logs/monthly-runs.log
```

### Update Tracking
Record completion in your tracking system:
- [ ] Mark "February 2026 Report" as complete
- [ ] Share summary with stakeholders
- [ ] Note any issues or anomalies

---

## Troubleshooting

### Issue: SSO Authentication Failed
**Symptoms**: Browser shows login page or "Session expired" error

**Solution**:
```bash
# Clear browser session
rm -rf .browser-session/

# Re-authenticate
npm run test-cerberus
# Complete SSO login in browser that opens
```

### Issue: One or More Fleets Failed
**Symptoms**: Console shows "❌ Fleet XXXXX: FAILED"

**Solution**:
```bash
# Check error message in console output
# Common causes:
# 1. Network timeout → Retry
# 2. Selector changed → See CERBERUS_SELECTORS.md
# 3. Fleet doesn't exist → Verify fleet ID

# Retry just the failed fleet
TEST_FLEET_ID=8304669 npm run test-scraper test-budget
```

### Issue: $0 Values in Report
**Symptoms**: IMR Goal or YTD Spend shows $0 or $0.00

**Solution**:
```bash
# Test in headed mode to see what's happening
SCRAPER_HEADLESS=false npm run test-cerberus

# Check if selectors changed
# Open browser DevTools and verify:
$$('.awsui-key-children')        # IMR Goal elements
$$('.mus-cell-right-aligned')    # YTD Spend elements

# If selectors changed, update lib/services/cerberus-scraper.ts
# See CERBERUS_SELECTORS.md for details
```

### Issue: Timeout Errors
**Symptoms**: "Navigation timeout of 60000 ms exceeded"

**Solution**:
```bash
# Check VPN connection
ping cerberus.cloudtune.amazon.dev

# Increase timeout in .env.local
echo "SCRAPER_TIMEOUT=120000" >> .env.local

# Retry
npm run scrape-monthly-report
```

### Issue: Out of Memory
**Symptoms**: "FATAL ERROR: Reached heap limit"

**Solution**:
```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"

# Retry
npm run scrape-monthly-report
```

---

## Emergency Fallback

If scraping completely fails and reports are urgent:

### Option 1: Manual Data Entry
1. Open Cerberus manually for each fleet
2. Copy data into template spreadsheet
3. Generate manual report

### Option 2: Use Previous Month's Data
```bash
# Copy last month's report as baseline
LAST_MONTH=$(date -v-1m +%Y-%m-%d)
cp -r reports/$LAST_MONTH reports/$TODAY
# Add note: "Using previous month's data due to scraping issue"
```

### Option 3: Contact Support
- **Primary**: [Your Team Email]
- **Slack**: #imr-budget-forecaster
- **Escalation**: [Manager Email]

---

## Success Criteria

✅ Report is successful if ALL of the following are true:

- [ ] All 6 fleets scraped without errors
- [ ] No $0 values in any fleet data
- [ ] IMR Goals are reasonable (> $1M typically)
- [ ] YTD Spends are reasonable (not negative, not > IMR Goal)
- [ ] Summary report generated
- [ ] Spot-check validation passed
- [ ] Reports saved to correct directory
- [ ] Execution logged

---

## Performance Benchmarks

Track these metrics over time to detect issues:

| Metric | Target | Alert If |
|--------|--------|----------|
| Total Duration | 2-3 minutes | > 5 minutes |
| Per-Fleet Time | 15-20 seconds | > 30 seconds |
| Success Rate | 100% (6/6) | < 100% |
| IMR Goal $0s | 0 fleets | Any fleet |
| YTD Spend $0s | 0 fleets | Any fleet |

```bash
# Log performance
echo "$(date): Duration=XXXs, Success=6/6, Errors=0" >> logs/performance.log
```

---

## Automation Setup (Optional)

### Cron Job Configuration

```bash
# Edit crontab
crontab -e

# Add this line (runs at 8 AM on 6th of each month):
0 8 6 * * cd /Users/zhongsea/imr-budget-forecaster && npm run scrape-monthly-report >> logs/cron-output.log 2>&1

# Verify cron job
crontab -l

# Test cron job manually
cd /Users/zhongsea/imr-budget-forecaster && npm run scrape-monthly-report
```

### Email Notification (Optional)

```bash
# Install mail utility (macOS)
brew install mailutils

# Add to cron job:
0 8 6 * * cd /Users/zhongsea/imr-budget-forecaster && npm run scrape-monthly-report && mail -s "Monthly Report" team@example.com < reports/$(date +%Y-%m-%d)/summary-report.txt
```

---

## Quick Reference Commands

```bash
# Navigate to project
cd /Users/zhongsea/imr-budget-forecaster

# Run monthly report
npm run scrape-monthly-report

# Test single fleet
TEST_FLEET_ID=8304669 npm run test-scraper test-budget

# View today's summary
cat reports/$(date +%Y-%m-%d)/summary-report.txt

# View fleet JSON
cat reports/$(date +%Y-%m-%d)/fleet-8304669.json | jq

# Clear SSO session
rm -rf .browser-session/

# Re-authenticate
npm run test-cerberus

# Check logs
tail -20 logs/monthly-runs.log
```

---

## Contact & Support

**Documentation**:
- `CERBERUS_DUAL_PERIOD_IMPLEMENTATION.md` - Technical details
- `CERBERUS_SELECTORS.md` - Selector reference
- `DEPLOYMENT.md` - Production setup
- `SCRAPING_SETUP.md` - Setup guide

**Team Contacts**:
- Primary: [Your Email]
- Slack: #imr-budget-forecaster
- GitHub: [Repository URL]

---

**Last Updated**: 2026-01-31  
**Version**: 1.0.0  
**Next Review**: After first production run
