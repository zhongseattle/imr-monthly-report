#!/usr/bin/env tsx

/**
 * Cerberus Complete Scraping Test
 * Tests the dual-period scraping for all 6 production fleet IDs
 */

import { config } from 'dotenv';
import { scrapeCerebusComplete } from '../lib/services/cerberus-scraper';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Configuration from .env.local
const CERBERUS_URL = process.env.CERBERUS_URL || 'https://cerberus.cloudtune.amazon.dev';
const FLEET_IDS = process.env.FLEET_IDS 
  ? process.env.FLEET_IDS.split(',').map(id => id.trim())
  : ['8304669', '8305082', '8304674', '10089347', '8967127', '3046715'];

async function testCerebusScraping() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Cerberus Dual-Period Scraping Test                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`Cerberus URL: ${CERBERUS_URL}`);
  console.log(`Testing ${FLEET_IDS.length} fleets\n`);
  console.log('═'.repeat(60));

  const results: any[] = [];
  const startTime = Date.now();

  for (let i = 0; i < FLEET_IDS.length; i++) {
    const fleetId = FLEET_IDS[i];
    console.log(`\n[${i + 1}/${FLEET_IDS.length}] Testing Fleet ${fleetId}...`);
    console.log('─'.repeat(60));

    const fleetStartTime = Date.now();

    try {
      const data = await scrapeCerebusComplete(fleetId, CERBERUS_URL);
      const fleetDuration = ((Date.now() - fleetStartTime) / 1000).toFixed(1);

      results.push({
        fleetId,
        fleetName: data.fleetName,
        success: true,
        imrGoal: data.imrGoal,
        ytdSpend: data.ytdSpend,
        projectedEOY: data.projectedEOY,
        variance: data.variance,
        isOverBudget: data.isOverBudget,
        duration: fleetDuration,
      });

      console.log(`\n✅ Fleet ${fleetId}: SUCCESS (${fleetDuration}s)`);
      console.log(`   Fleet Name: ${data.fleetName}`);
      console.log(`   IMR Goal: $${data.imrGoal.toLocaleString()}`);
      console.log(`   YTD Spend: $${data.ytdSpend.toLocaleString()}`);
      console.log(`   Projected EOY: $${data.projectedEOY.toLocaleString()}`);
      console.log(`   Variance: $${data.variance.toLocaleString()} (${data.variancePercent.toFixed(1)}%)`);
      console.log(`   Status: ${data.isOverBudget ? '⚠️  OVER' : '✅ UNDER'} Budget`);

    } catch (error: any) {
      const fleetDuration = ((Date.now() - fleetStartTime) / 1000).toFixed(1);

      results.push({
        fleetId,
        success: false,
        error: error.message,
        duration: fleetDuration,
      });

      console.log(`\n❌ Fleet ${fleetId}: FAILED (${fleetDuration}s)`);
      console.log(`   Error: ${error.message}`);
    }

    console.log('─'.repeat(60));

    // Small delay between fleets to avoid rate limiting
    if (i < FLEET_IDS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

  // Summary
  console.log('\n═'.repeat(60));
  console.log('TEST SUMMARY');
  console.log('═'.repeat(60));

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`\n📊 Results: ${successCount}/${FLEET_IDS.length} successful`);
  console.log(`⏱️  Total Time: ${totalDuration}s`);
  console.log(`⏱️  Average Time per Fleet: ${(parseFloat(totalDuration) / FLEET_IDS.length).toFixed(1)}s`);

  if (successCount > 0) {
    console.log('\n✅ Successful Fleets:');
    results.filter(r => r.success).forEach(r => {
      console.log(`   • ${r.fleetId}: ${r.fleetName}`);
      console.log(`     IMR: $${r.imrGoal.toLocaleString()}, YTD: $${r.ytdSpend.toLocaleString()}`);
      console.log(`     Status: ${r.isOverBudget ? 'OVER' : 'UNDER'} Budget`);
    });
  }

  if (failCount > 0) {
    console.log('\n❌ Failed Fleets:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   • ${r.fleetId}: ${r.error}`);
    });
  }

  console.log('\n═'.repeat(60));
  console.log(`✨ Testing complete! (${successCount}/${FLEET_IDS.length} passed)`);
  console.log('═'.repeat(60) + '\n');

  // Exit with error code if any failed
  process.exit(failCount > 0 ? 1 : 0);
}

// Run the test
testCerebusScraping().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
