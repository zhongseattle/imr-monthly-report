# Deployment Guide - IMR Budget Forecaster

Complete guide for deploying and operating the IMR Budget Forecaster in production.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Environment Configuration](#environment-configuration)
- [SSO Authentication Setup](#sso-authentication-setup)
- [Testing Before Production](#testing-before-production)
- [Monthly Report Execution](#monthly-report-execution)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Prerequisites

### System Requirements
- **Node.js**: v18.20.2 or higher
- **npm**: v10.x or higher
- **OS**: macOS, Linux, or Windows (with WSL2)
- **Memory**: Minimum 2GB available RAM
- **Disk**: 500MB for dependencies + browser

### Access Requirements
- Valid Amazon SSO credentials
- Access to Cerberus dashboard (https://cerberus.cloudtune.amazon.dev)
- Permissions to view fleet budget data for all 6 production fleets

### Network Requirements
- Connection to Amazon internal network (VPN if remote)
- HTTPS access to cerberus.cloudtune.amazon.dev
- Port 3000 available for local development server (optional)

## Initial Setup

### 1. Clone Repository
```bash
cd ~/projects
git clone <repository-url> imr-budget-forecaster
cd imr-budget-forecaster
```

### 2. Install Dependencies
```bash
npm install
```

**Expected Output**:
```
added 234 packages, and audited 235 packages in 15s
```

**Verify Installation**:
```bash
npm list puppeteer
# Should show: puppeteer@23.11.1

node --version
# Should show: v18.20.2 or higher
```

### 3. Directory Structure
```bash
imr-budget-forecaster/
├── .browser-session/      # Browser session storage (auto-created)
├── lib/
│   └── services/
│       ├── cerberus-scraper.ts    # Core scraping logic
│       └── cerebus-api.ts         # API integration
├── scripts/
│   ├── test-cerberus-complete.js  # Testing script
│   └── scrape-monthly-report.js   # Production script
├── reports/               # Monthly report output (auto-created)
├── .env.local            # Environment configuration
└── package.json
```

## Environment Configuration

### 1. Create `.env.local` File
```bash
cp .env.example .env.local
```

### 2. Configure Environment Variables

Edit `.env.local`:

```bash
# Cerberus Configuration
CERBERUS_URL=https://cerberus.cloudtune.amazon.dev

# Production Fleet IDs (comma-separated, no spaces)
FLEET_IDS=8304669,8305082,8304674,10089347,8967127,3046715

# Optional: Browser Configuration
HEADLESS_MODE=false  # Set to 'true' for production automation
```

### 3. Verify Configuration
```bash
# Test that environment variables load correctly
node -e "require('dotenv').config({path: '.env.local'}); console.log(process.env.CERBERUS_URL)"

# Expected output:
# https://cerberus.cloudtune.amazon.dev
```

### Fleet ID Reference

| Fleet ID | Fleet Name | Owner |
|----------|------------|-------|
| 8304669 | IMR-Tuna-Fleet | Team A |
| 8305082 | IMR-Salmon-Fleet | Team B |
| 8304674 | IMR-Trout-Fleet | Team C |
| 10089347 | IMR-Bass-Fleet | Team D |
| 8967127 | IMR-Pike-Fleet | Team E |
| 3046715 | IMR-Carp-Fleet | Team F |

## SSO Authentication Setup

### First-Time Authentication

The scraper requires manual SSO login on first run:

#### 1. Run Initial Test
```bash
npm run test-cerberus
```

#### 2. Browser Window Opens
- Browser automatically opens to Cerberus login page
- **Do NOT close this window**

#### 3. Complete SSO Login
1. Enter your Amazon credentials
2. Complete MFA/2FA if prompted
3. Wait for redirect to Cerberus dashboard
4. Script will automatically continue

#### 4. Session Persistence
- Session saved to `.browser-session/` directory
- Future runs reuse this session (no re-login required)
- Session typically valid for 7-14 days

### Session Refresh

If you see authentication errors:

```bash
# Clear old session
rm -rf .browser-session/

# Re-authenticate
npm run test-cerberus
# Complete SSO login again
```

### Automated Sessions (Advanced)

For fully automated runs (cron jobs):

```bash
# Option 1: Keep session alive with weekly refresh
crontab -e

# Add this line to refresh session every Monday at 8am:
0 8 * * 1 cd /path/to/imr-budget-forecaster && npm run test-cerberus

# Option 2: Use headless mode (may require additional SSO setup)
HEADLESS_MODE=true npm run scrape-monthly-report
```

## Testing Before Production

### Level 1: Single Fleet Test

Test with one fleet to verify basic functionality:

```bash
# Edit scripts/test-cerberus-complete.js
# Temporarily change to test only one fleet:
const FLEET_IDS = ['8304669'];  // Comment out other IDs

npm run test-cerberus
```

**Expected Output**:
```
=== Testing Fleet 8304669 ===
Fleet: IMR-Tuna-Fleet
IMR Goal: $2,360,000
YTD Spend: $150,900
Projected EOY: $150,900
Variance: -$2,209,100
✅ Test passed
```

### Level 2: All Fleets Test

Test all 6 production fleets:

```bash
# Restore all fleet IDs in scripts/test-cerberus-complete.js
npm run test-cerberus
```

**Expected Duration**: ~2-3 minutes

**Success Criteria**:
- All 6 fleets complete without errors
- IMR Goal > $0 for all fleets
- YTD Spend > $0 for all fleets
- No timeout errors

### Level 3: Monthly Report Dry Run

Test the full monthly report process:

```bash
npm run scrape-monthly-report
```

**Verify Output**:

```bash
# Check reports directory created
ls reports/

# Check today's report folder
ls reports/$(date +%Y-%m-%d)/

# Expected files (6 JSON + 1 summary):
# fleet-8304669.json
# fleet-8305082.json
# fleet-8304674.json
# fleet-10089347.json
# fleet-8967127.json
# fleet-3046715.json
# summary-report.txt

# View summary
cat reports/$(date +%Y-%m-%d)/summary-report.txt
```

**Success Criteria**:
- All 7 files created
- No error messages in console
- Summary table shows all 6 fleets
- JSON files contain valid data (no $0 values)

### Level 4: Data Validation

Manually verify data accuracy:

```bash
# Compare scraped data vs. Cerberus UI
# Open fleet in browser:
open https://cerberus.cloudtune.amazon.dev/fleet/8304669

# Compare with scraped data:
cat reports/$(date +%Y-%m-%d)/fleet-8304669.json | jq '.imrGoal, .ytdSpend'
```

**Validation Checklist**:
- [ ] Fleet name matches
- [ ] IMR Goal matches (Full Year view)
- [ ] YTD Spend matches (Year to Date view)
- [ ] Calculations are correct (burn rate, projected EOY, variance)

## Monthly Report Execution

### Recommended Schedule

**Run Date**: 6th of each month  
**Reason**: Gives 5 business days for previous month's data to finalize

**Time**: 8:00 AM local time  
**Reason**: Off-peak hours for Cerberus, reduces load

### Manual Execution

```bash
cd /path/to/imr-budget-forecaster

# Ensure you're on main branch and up to date
git pull origin main

# Install/update dependencies
npm install

# Run monthly report
npm run scrape-monthly-report
```

### Automated Execution (Cron)

#### Setup Cron Job

```bash
crontab -e
```

Add this line:
```bash
# Run IMR Budget Forecaster on 6th of each month at 8am
0 8 6 * * cd /Users/zhongsea/imr-budget-forecaster && npm run scrape-monthly-report >> /Users/zhongsea/imr-budget-forecaster/logs/cron.log 2>&1
```

#### Create Log Directory
```bash
mkdir -p logs
```

#### Verify Cron Job
```bash
crontab -l
# Should show your cron entry

# Test cron job (runs immediately)
/bin/bash -c "cd /Users/zhongsea/imr-budget-forecaster && npm run scrape-monthly-report"
```

### Output Management

#### Report Archive Structure
```
reports/
├── 2025-12-06/
│   ├── fleet-8304669.json
│   ├── ...
│   └── summary-report.txt
├── 2026-01-06/
│   └── ...
└── 2026-02-06/
    └── ...
```

#### Retention Policy

**Recommendation**: Keep 24 months of reports (2 years)

```bash
# Create cleanup script
cat > scripts/cleanup-old-reports.sh << 'EOF'
#!/bin/bash
# Delete reports older than 24 months
find reports/ -type d -mtime +730 -exec rm -rf {} \;
echo "Cleanup complete: $(date)"
EOF

chmod +x scripts/cleanup-old-reports.sh

# Add to cron (runs monthly after report generation)
# 0 9 6 * * /path/to/imr-budget-forecaster/scripts/cleanup-old-reports.sh
```

### Sharing Reports

#### Export to CSV (Optional)

```bash
# Convert JSON reports to CSV
cat > scripts/json-to-csv.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y-%m-%d)
REPORT_DIR="reports/$DATE"

echo "Fleet ID,Fleet Name,IMR Goal,YTD Spend,Monthly Burn,Projected EOY,Variance" > "$REPORT_DIR/summary.csv"

for file in "$REPORT_DIR"/fleet-*.json; do
  jq -r '[.fleetId, .fleetName, .imrGoal, .ytdSpend, .monthlyBurnRate, .projectedEOY, .variance] | @csv' "$file" >> "$REPORT_DIR/summary.csv"
done

echo "CSV created: $REPORT_DIR/summary.csv"
EOF

chmod +x scripts/json-to-csv.sh
```

#### Email Reports (Optional)

```bash
# Install mail utility (macOS)
# brew install mailutils

# Send summary email
cat > scripts/email-report.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y-%m-%d)
SUMMARY="reports/$DATE/summary-report.txt"

if [ -f "$SUMMARY" ]; then
  mail -s "IMR Budget Report - $DATE" team@example.com < "$SUMMARY"
  echo "Email sent: $DATE"
else
  echo "ERROR: Report not found: $SUMMARY"
fi
EOF

chmod +x scripts/email-report.sh
```

## Monitoring & Maintenance

### Health Checks

#### Daily Health Check
```bash
# Verify browser session is still valid
ls -la .browser-session/

# Check recent reports
ls -lt reports/ | head -5
```

#### Weekly Verification
```bash
# Test scraping still works
npm run test-cerberus

# Check for Cerberus UI changes
# Manually review one fleet to ensure selectors work
```

#### Monthly Audit
```bash
# Review all generated reports
ls reports/

# Verify data quality (no zeros)
grep -r '"imrGoal": 0' reports/
grep -r '"ytdSpend": 0' reports/

# Check for errors in logs
tail -50 logs/cron.log
```

### Performance Monitoring

Track scraping performance over time:

```bash
# Add timing to script
cat > scripts/performance-log.sh << 'EOF'
#!/bin/bash
START=$(date +%s)
npm run scrape-monthly-report
END=$(date +%s)
DURATION=$((END - START))
echo "$(date +%Y-%m-%d) - Duration: ${DURATION}s" >> logs/performance.log
EOF

chmod +x scripts/performance-log.sh
```

**Expected Performance**:
- Single fleet: 15-20 seconds
- All 6 fleets: 2-3 minutes
- **Alert if**: Duration exceeds 5 minutes

### Update Procedures

#### Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Test after update
npm run test-cerberus
```

#### Code Updates

```bash
# Pull latest changes
git pull origin main

# Review changes
git log --oneline -10

# Test changes
npm run test-cerberus

# Deploy to production (manual approval)
npm run scrape-monthly-report
```

#### Selector Updates

When Cerberus UI changes (see `CERBERUS_SELECTORS.md`):

1. **Detect Change**
   ```bash
   # Scraping returns $0 values or errors
   npm run test-cerberus
   # Shows: "IMR Goal is 0" or "YTD Spend is 0"
   ```

2. **Investigate**
   ```bash
   # Open Cerberus manually
   open https://cerberus.cloudtune.amazon.dev/fleet/8304669
   # Use DevTools to find new selectors
   ```

3. **Update Code**
   - Edit `lib/services/cerberus-scraper.ts`
   - Update selectors and indices
   - Update `CERBERUS_SELECTORS.md`

4. **Test**
   ```bash
   npm run test-cerberus
   ```

5. **Deploy**
   ```bash
   git commit -m "Update Cerberus selectors"
   git push origin main
   ```

## Troubleshooting

### Issue: Authentication Failed

**Symptoms**:
```
Error: Session expired or authentication required
```

**Solutions**:
```bash
# Clear session and re-authenticate
rm -rf .browser-session/
npm run test-cerberus
# Complete SSO login when browser opens
```

### Issue: Timeout Errors

**Symptoms**:
```
TimeoutError: Navigation timeout of 60000 ms exceeded
```

**Solutions**:
```bash
# Check network connection
ping cerberus.cloudtune.amazon.dev

# Check VPN connection
# (reconnect to Amazon VPN)

# Increase timeout in code (lib/services/cerberus-scraper.ts)
await page.goto(url, { 
  waitUntil: 'networkidle2',
  timeout: 120000  // Increase to 2 minutes
});
```

### Issue: Data Extraction Errors

**Symptoms**:
```
IMR Goal: $0
YTD Spend: $0
```

**Solutions**:
```bash
# Test in headed mode to see browser
HEADLESS_MODE=false npm run test-cerberus

# Check if selectors changed
# See CERBERUS_SELECTORS.md for testing commands

# Verify period switching works
# Check console output for "Switched to Full Year" messages
```

### Issue: Permission Denied

**Symptoms**:
```
Error: EACCES: permission denied, mkdir 'reports'
```

**Solutions**:
```bash
# Fix directory permissions
chmod 755 .
mkdir -p reports
chmod 755 reports

# Fix file ownership
sudo chown -R $USER:$USER .
```

### Issue: Out of Memory

**Symptoms**:
```
FATAL ERROR: Reached heap limit
```

**Solutions**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Or add to package.json scripts:
"scrape-monthly-report": "node --max-old-space-size=4096 scripts/scrape-monthly-report.js"

# Close browser between fleets (already implemented)
# Monitor memory usage:
top -pid $(pgrep node)
```

## Security Best Practices

### 1. Protect Browser Session
```bash
# Ensure .browser-session/ is not committed
echo ".browser-session/" >> .gitignore

# Restrict permissions
chmod 700 .browser-session/
```

### 2. Secure Environment Variables
```bash
# Never commit .env.local
echo ".env.local" >> .gitignore

# Use restrictive permissions
chmod 600 .env.local
```

### 3. Protect Report Data
```bash
# Reports contain confidential financial data
chmod 700 reports/
chmod 600 reports/**/*.json
```

### 4. Audit Access
```bash
# Log who runs scraping
echo "$(date) - $(whoami)" >> logs/access.log

# Review access logs regularly
tail -20 logs/access.log
```

### 5. Network Security
- Always use VPN when accessing Cerberus
- Never expose scraping scripts on public networks
- Use HTTPS only (never HTTP)

## Backup & Recovery

### Backup Strategy

```bash
# Daily backup of reports to S3 (example)
aws s3 sync reports/ s3://imr-budget-reports/ --exclude "*.tmp"

# Or local backup
tar -czf backups/reports-$(date +%Y-%m-%d).tar.gz reports/
```

### Recovery Procedures

```bash
# Restore from S3
aws s3 sync s3://imr-budget-reports/ reports/

# Or restore from local backup
tar -xzf backups/reports-2026-01-06.tar.gz
```

## Production Checklist

Before going live with automated monthly reports:

### Pre-Deployment
- [ ] All dependencies installed (`npm install`)
- [ ] `.env.local` configured with correct fleet IDs
- [ ] SSO authentication completed (`.browser-session/` exists)
- [ ] Single fleet test passes (`npm run test-cerberus`)
- [ ] All 6 fleets test passes
- [ ] Monthly report test passes (`npm run scrape-monthly-report`)
- [ ] Data validation completed (manual comparison)
- [ ] Logs directory created (`mkdir logs`)
- [ ] Reports directory created (`mkdir reports`)

### Deployment
- [ ] Cron job configured for 6th of each month
- [ ] Cron job tested (manual trigger)
- [ ] Email notifications configured (optional)
- [ ] CSV export configured (optional)
- [ ] Performance monitoring enabled

### Post-Deployment
- [ ] First monthly report successful
- [ ] Report data verified for accuracy
- [ ] Team notified of new automated reports
- [ ] Documentation distributed to stakeholders
- [ ] Maintenance schedule established

## Support & Escalation

### Contact Information

**Primary Contact**: [Your Name/Team]  
**Email**: [team-email@example.com]  
**Slack**: #imr-budget-forecaster

### Escalation Path

1. **Level 1**: Check troubleshooting section above
2. **Level 2**: Review logs (`logs/cron.log`)
3. **Level 3**: Manual test run (`npm run test-cerberus`)
4. **Level 4**: Contact development team
5. **Level 5**: Escalate to Cerberus team (UI changes)

### Change Management

All changes to production configuration require:
- [ ] Code review (if code changes)
- [ ] Testing in non-production environment
- [ ] Approval from team lead
- [ ] Documentation update
- [ ] Deployment during maintenance window

---

## Quick Reference Commands

```bash
# Installation
npm install

# Testing
npm run test-cerberus                    # Test all 6 fleets
npm run scrape-monthly-report            # Production monthly report

# Authentication
rm -rf .browser-session/                 # Clear session
npm run test-cerberus                    # Re-authenticate

# Reports
ls reports/                              # List all reports
cat reports/$(date +%Y-%m-%d)/summary-report.txt  # View today's summary
cat reports/2026-01-06/fleet-8304669.json | jq   # View fleet JSON

# Monitoring
tail -f logs/cron.log                    # Watch cron execution
grep -r '"imrGoal": 0' reports/          # Find $0 IMR Goals
grep -r '"ytdSpend": 0' reports/         # Find $0 YTD Spends

# Maintenance
npm outdated                             # Check for updates
git pull origin main                     # Update code
npm update                               # Update dependencies
```

---

**Last Updated**: 2026-01-31  
**Document Version**: 1.0.0  
**Maintained By**: IMR Budget Forecaster Team
