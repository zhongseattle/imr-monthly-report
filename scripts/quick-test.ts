#!/usr/bin/env tsx

/**
 * Quick verification script - assumes session is already authenticated
 * Tests scraping a single fleet without manual login prompt
 */

import { config } from 'dotenv';
import { scrapeCerebusComplete } from '../lib/services/cerberus-scraper';

// Load environment variables from .env.local
config({ path: '.env.local' });

const CERBERUS_URL = process.env.CERBERUS_URL || 'https://cerberus.cloudtune.amazon.dev';
const TEST_FLEET_ID = process.env.TEST_FLEET_ID || '8304669';

async function quickTest() {
  console.log('\n🔍 Quick Scraping Test (Single Fleet)');
  console.log(`Fleet ID: ${TEST_FLEET_ID}`);
  console.log(`Cerberus URL: ${CERBERUS_URL}\n`);

  try {
    const startTime = Date.now();
    const data = await scrapeCerebusComplete(TEST_FLEET_ID, CERBERUS_URL);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('✅ SUCCESS!');
    console.log(`Duration: ${duration}s\n`);
    console.log('Results:');
    console.log(`  Fleet Name: ${data.fleetName}`);
    console.log(`  Fleet ID: ${data.fleetId}`);
    console.log(`  IMR Goal: $${data.imrGoal.toLocaleString()}`);
    console.log(`  YTD Spend: $${data.ytdSpend.toLocaleString()}`);
    console.log(`  Monthly Burn: $${data.monthlyBurnRate.toLocaleString()}`);
    console.log(`  Projected EOY: $${data.projectedEOY.toLocaleString()}`);
    console.log(`  Variance: $${data.variance.toLocaleString()} (${data.variancePercent.toFixed(1)}%)`);
    console.log(`  Status: ${data.isOverBudget ? '⚠️  OVER BUDGET' : '✅ UNDER BUDGET'}\n`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ FAILED');
    console.error(`Error: ${error.message}\n`);
    process.exit(1);
  }
}

quickTest();
