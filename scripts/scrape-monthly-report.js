#!/usr/bin/env node

/**
 * Monthly Cerberus Report Generator
 * Run this script on the 6th of each month to generate fleet budget reports
 * 
 * Usage: npm run scrape-monthly-report
 */

const path = require('path');
const fs = require('fs').promises;

// Configuration
const CERBERUS_URL = process.env.CERBERUS_URL || 'https://cerberus.cloudtune.amazon.dev';
const FLEET_IDS = process.env.FLEET_IDS 
  ? process.env.FLEET_IDS.split(',').map(id => id.trim())
  : ['8304669', '8305082', '8304674', '10089347', '8967127', '3046715'];

// Generate report date
const today = new Date();
const reportDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
const reportMonth = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

async function scrapeAllFleets() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                MONTHLY CERBERUS REPORT                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  console.log(`📅 Report Date: ${reportDate}`);
  console.log(`📊 Report Period: ${reportMonth}`);
  console.log(`🏢 Fleets to Process: ${FLEET_IDS.length}`);
  console.log(`🌐 Cerberus URL: ${CERBERUS_URL}\n`);
  console.log('═'.repeat(60));

  const results = [];
  const startTime = Date.now();

  // Create reports directory if it doesn't exist
  const reportsDir = path.join(process.cwd(), 'reports', reportDate);
  try {
    await fs.mkdir(reportsDir, { recursive: true });
    console.log(`\n📁 Reports will be saved to: ${reportsDir}\n`);
  } catch (error) {
    console.error(`❌ Failed to create reports directory: ${error.message}`);
    process.exit(1);
  }

  // Scrape each fleet
  for (let i = 0; i < FLEET_IDS.length; i++) {
    const fleetId = FLEET_IDS[i];
    console.log(`\n[${i + 1}/${FLEET_IDS.length}] Processing Fleet ${fleetId}...`);
    console.log('─'.repeat(60));

    const fleetStartTime = Date.now();

    try {
      const { scrapeCerebusComplete } = require('../lib/services/cerberus-scraper');
      const data = await scrapeCerebusComplete(fleetId, CERBERUS_URL);
      const fleetDuration = ((Date.now() - fleetStartTime) / 1000).toFixed(1);

      // Store result
      const result = {
        fleetId: data.fleetId,
        fleetName: data.fleetName,
        reportDate,
        fiscalYear: data.fiscalYear,
        imrGoal: data.imrGoal,
        ytdSpend: data.ytdSpend,
        monthsElapsed: data.monthsElapsed,
        monthlyBurnRate: data.monthlyBurnRate,
        projectedEOY: data.projectedEOY,
        variance: data.variance,
        variancePercent: data.variancePercent,
        percentComplete: data.percentComplete,
        isOverBudget: data.isOverBudget,
        scrapingDuration: fleetDuration,
        success: true,
      };

      results.push(result);

      // Save individual fleet JSON
      const fleetJsonPath = path.join(reportsDir, `fleet-${fleetId}.json`);
      await fs.writeFile(fleetJsonPath, JSON.stringify(result, null, 2), 'utf-8');

      console.log(`\n✅ Fleet ${fleetId}: SUCCESS (${fleetDuration}s)`);
      console.log(`   ${data.fleetName}`);
      console.log(`   IMR Goal: $${data.imrGoal.toLocaleString()}`);
      console.log(`   YTD Spend: $${data.ytdSpend.toLocaleString()} (${data.percentComplete.toFixed(1)}%)`);
      console.log(`   Projected EOY: $${data.projectedEOY.toLocaleString()}`);
      console.log(`   Variance: $${data.variance.toLocaleString()} (${data.variancePercent.toFixed(1)}%)`);
      console.log(`   Status: ${data.isOverBudget ? '⚠️  OVER Budget' : '✅ UNDER Budget'}`);
      console.log(`   📄 Saved: fleet-${fleetId}.json`);

    } catch (error) {
      const fleetDuration = ((Date.now() - fleetStartTime) / 1000).toFixed(1);

      const result = {
        fleetId,
        reportDate,
        error: error.message,
        scrapingDuration: fleetDuration,
        success: false,
      };

      results.push(result);

      console.log(`\n❌ Fleet ${fleetId}: FAILED (${fleetDuration}s)`);
      console.log(`   Error: ${error.message}`);

      // Save error JSON
      const errorJsonPath = path.join(reportsDir, `fleet-${fleetId}-ERROR.json`);
      await fs.writeFile(errorJsonPath, JSON.stringify(result, null, 2), 'utf-8');
    }

    console.log('─'.repeat(60));

    // Delay between fleets
    if (i < FLEET_IDS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

  // Generate summary report
  await generateSummaryReport(results, reportsDir, totalDuration);

  // Display console summary
  displayConsoleSummary(results, totalDuration);

  // Exit with appropriate code
  const failCount = results.filter(r => !r.success).length;
  process.exit(failCount > 0 ? 1 : 0);
}

async function generateSummaryReport(results, reportsDir, totalDuration) {
  const successfulFleets = results.filter(r => r.success);
  const failedFleets = results.filter(r => !r.success);

  let report = '';
  report += '═'.repeat(70) + '\n';
  report += 'MONTHLY CERBERUS BUDGET REPORT\n';
  report += '═'.repeat(70) + '\n\n';
  report += `Report Date: ${reportDate}\n`;
  report += `Report Period: ${reportMonth}\n`;
  report += `Generated: ${new Date().toLocaleString()}\n\n`;
  report += `Total Fleets: ${results.length}\n`;
  report += `Successful: ${successfulFleets.length}\n`;
  report += `Failed: ${failedFleets.length}\n`;
  report += `Total Time: ${totalDuration}s\n\n`;
  report += '═'.repeat(70) + '\n';

  if (successfulFleets.length > 0) {
    report += '\n📊 FLEET SUMMARY\n';
    report += '═'.repeat(70) + '\n\n';

    let totalIMR = 0;
    let totalYTD = 0;
    let totalProjected = 0;
    let totalVariance = 0;

    successfulFleets.forEach((fleet, index) => {
      totalIMR += fleet.imrGoal;
      totalYTD += fleet.ytdSpend;
      totalProjected += fleet.projectedEOY;
      totalVariance += fleet.variance;

      report += `${index + 1}. ${fleet.fleetName} (${fleet.fleetId})\n`;
      report += `   IMR Goal:       $${fleet.imrGoal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      report += `   YTD Spend:      $${fleet.ytdSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${fleet.percentComplete.toFixed(1)}%)\n`;
      report += `   Projected EOY:  $${fleet.projectedEOY.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      report += `   Variance:       $${fleet.variance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${fleet.variancePercent.toFixed(1)}%)\n`;
      report += `   Status:         ${fleet.isOverBudget ? '⚠️  OVER BUDGET' : '✅ UNDER BUDGET'}\n`;
      report += `   Burn Rate:      $${fleet.monthlyBurnRate.toLocaleString('en-US', { maximumFractionDigits: 0 })}/month\n\n`;
    });

    report += '─'.repeat(70) + '\n';
    report += `TOTALS (All ${successfulFleets.length} Fleets)\n`;
    report += '─'.repeat(70) + '\n';
    report += `Total IMR Goal:      $${totalIMR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    report += `Total YTD Spend:     $${totalYTD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    report += `Total Projected EOY: $${totalProjected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    report += `Total Variance:      $${totalVariance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    report += `Overall Status:      ${totalProjected > totalIMR ? '⚠️  OVER BUDGET' : '✅ UNDER BUDGET'}\n\n`;
  }

  if (failedFleets.length > 0) {
    report += '═'.repeat(70) + '\n';
    report += '\n❌ FAILED FLEETS\n';
    report += '═'.repeat(70) + '\n\n';

    failedFleets.forEach((fleet, index) => {
      report += `${index + 1}. Fleet ${fleet.fleetId}\n`;
      report += `   Error: ${fleet.error}\n\n`;
    });
  }

  report += '═'.repeat(70) + '\n';
  report += 'END OF REPORT\n';
  report += '═'.repeat(70) + '\n';

  // Save text report
  const reportPath = path.join(reportsDir, 'summary-report.txt');
  await fs.writeFile(reportPath, report, 'utf-8');

  // Save JSON summary
  const jsonSummaryPath = path.join(reportsDir, 'summary.json');
  await fs.writeFile(jsonSummaryPath, JSON.stringify({
    reportDate,
    reportPeriod: reportMonth,
    generatedAt: new Date().toISOString(),
    totalFleets: results.length,
    successful: successfulFleets.length,
    failed: failedFleets.length,
    totalDuration,
    fleets: results,
  }, null, 2), 'utf-8');

  console.log(`\n📄 Summary report saved: summary-report.txt`);
  console.log(`📄 JSON summary saved: summary.json`);
}

function displayConsoleSummary(results, totalDuration) {
  console.log('\n═'.repeat(60));
  console.log('MONTHLY REPORT COMPLETE');
  console.log('═'.repeat(60));

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`\n📊 Results: ${successCount}/${results.length} successful`);
  console.log(`⏱️  Total Time: ${totalDuration}s`);
  console.log(`⏱️  Average: ${(totalDuration / results.length).toFixed(1)}s per fleet`);

  if (successCount > 0) {
    const successfulFleets = results.filter(r => r.success);
    const overBudgetCount = successfulFleets.filter(r => r.isOverBudget).length;
    const underBudgetCount = successfulFleets.filter(r => !r.isOverBudget).length;

    console.log(`\n📈 Budget Status:`);
    console.log(`   ✅ Under Budget: ${underBudgetCount} fleets`);
    console.log(`   ⚠️  Over Budget: ${overBudgetCount} fleets`);
  }

  if (failCount > 0) {
    console.log(`\n❌ Failures: ${failCount} fleets`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`   • ${r.fleetId}: ${r.error}`);
    });
  }

  console.log('\n═'.repeat(60));
  console.log(`✨ Report saved to: reports/${reportDate}/`);
  console.log('═'.repeat(60) + '\n');
}

// Check if TypeScript is compiled
const scraperPath = path.join(__dirname, '../lib/services/cerberus-scraper.js');

if (!require('fs').existsSync(scraperPath)) {
  console.error('\n❌ Error: TypeScript not compiled yet!\n');
  console.error('Please run: npm run build\n');
  console.error('Then run this script again.\n');
  process.exit(1);
}

// Run the monthly report
scrapeAllFleets().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
