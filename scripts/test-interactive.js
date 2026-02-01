#!/usr/bin/env node

/**
 * Interactive Cerberus Scraper Tester
 * Opens browser, lets you login, then tests scraping
 */

const puppeteer = require('puppeteer');
const readline = require('readline');
const path = require('path');

const CERBERUS_URL = process.env.CERBERUS_URL || 'https://cerberus.cloudtune.amazon.dev';
const TEST_FLEET_ID = process.env.TEST_FLEET_ID || '8304669';
const BROWSER_SESSION_DIR = path.join(process.cwd(), '.browser-session');

const SELECTORS = {
  fleetName: 'strong',
  fleetId: '[data-testid="mus-overview-fleetid"]',
  totalBudget: '.awsui-key-children',
  currentSpend: '.mus-cell-right-aligned',
  usageTable: 'table',
};

function buildCerberusUrl(fleetId) {
  const now = new Date();
  const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  
  const url = new URL('/usage', CERBERUS_URL);
  url.searchParams.set('fleetId', fleetId);
  url.searchParams.set('billingPeriod', billingPeriod);
  url.searchParams.set('activeTab', 'usage-imr-goal');
  
  return url.toString();
}

function parseCurrency(value) {
  if (!value) return 0;
  
  let cleaned = value.replace(/[$,\s]/g, '');
  
  if (cleaned.toUpperCase().endsWith('MM')) {
    cleaned = cleaned.slice(0, -2);
    return parseFloat(cleaned) * 1000000;
  }
  
  const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
  const lastChar = cleaned.slice(-1).toUpperCase();
  if (multipliers[lastChar]) {
    cleaned = cleaned.slice(0, -1);
    return parseFloat(cleaned) * multipliers[lastChar];
  }
  
  return parseFloat(cleaned) || 0;
}

function askUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function testScraping() {
  console.log('\n🧪 Interactive Cerberus Scraping Test\n');
  console.log('═'.repeat(60));
  console.log(`Fleet ID: ${TEST_FLEET_ID}`);
  console.log(`URL: ${buildCerberusUrl(TEST_FLEET_ID)}`);
  console.log('═'.repeat(60) + '\n');
  
  let browser;
  try {
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: false,
      userDataDir: BROWSER_SESSION_DIR,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    const fleetUrl = buildCerberusUrl(TEST_FLEET_ID);
    console.log('📡 Navigating to Cerberus...\n');
    await page.goto(fleetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log('⚠️  IMPORTANT: ');
    console.log('   1. Look at the browser window');
    console.log('   2. If you see a login page, complete the SSO authentication');
    console.log('   3. Wait for the Cerberus Usage IMR Goal page to fully load');
    console.log('   4. You should see budget/spend data on the page\n');
    
    await askUser('Press ENTER when the Cerberus page is fully loaded and you can see the data... ');
    
    console.log('\n✅ Testing selectors...\n');
    console.log('═'.repeat(60) + '\n');
    
    // Get current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}\n`);
    
    // Test Fleet Name
    console.log('🔍 Testing Fleet Name (strong tag)...');
    try {
      const allStrong = await page.$$('strong');
      console.log(`   Found ${allStrong.length} <strong> elements`);
      
      for (let i = 0; i < Math.min(5, allStrong.length); i++) {
        const text = await page.evaluate(el => el.textContent.trim(), allStrong[i]);
        console.log(`   [${i}] ${text}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
    
    // Test Fleet ID
    console.log('\n🔍 Testing Fleet ID selector...');
    try {
      const fleetIdElement = await page.$(SELECTORS.fleetId);
      if (fleetIdElement) {
        const text = await page.evaluate(el => el.textContent.trim(), fleetIdElement);
        console.log(`   ✅ ${text}`);
      } else {
        console.log(`   ❌ Not found with selector: ${SELECTORS.fleetId}`);
        // Try alternative
        const altElements = await page.$$('[data-testid]');
        console.log(`   Found ${altElements.length} elements with data-testid attribute`);
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
    
    // Test Budget
    console.log('\n🔍 Testing Budget (.awsui-key-children)...');
    try {
      const budgetElements = await page.$$(SELECTORS.totalBudget);
      console.log(`   Found ${budgetElements.length} elements`);
      
      for (let i = 0; i < Math.min(10, budgetElements.length); i++) {
        const text = await page.evaluate(el => el.textContent.trim(), budgetElements[i]);
        if (text) {
          const amount = parseCurrency(text);
          console.log(`   [${i}] Text: "${text}" → Parsed: $${amount.toLocaleString()}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
    
    // Test Current Spend
    console.log('\n🔍 Testing Current Spend (.mus-cell-right-aligned)...');
    try {
      const spendElements = await page.$$(SELECTORS.currentSpend);
      console.log(`   Found ${spendElements.length} elements`);
      
      for (let i = 0; i < Math.min(10, spendElements.length); i++) {
        const text = await page.evaluate(el => el.textContent.trim(), spendElements[i]);
        if (text) {
          const amount = parseCurrency(text);
          console.log(`   [${i}] Text: "${text}" → Parsed: $${amount.toLocaleString()}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
    
    // Test Tables
    console.log('\n🔍 Testing Tables...');
    try {
      const tables = await page.$$('table');
      console.log(`   Found ${tables.length} table(s)`);
      
      if (tables.length > 0) {
        for (let t = 0; t < tables.length; t++) {
          console.log(`\n   Table ${t + 1}:`);
          const rows = await page.evaluate(table => {
            const rows = Array.from(table.querySelectorAll('tr'));
            return rows.slice(0, 5).map(row => {
              return Array.from(row.querySelectorAll('th, td')).map(cell => cell.textContent.trim());
            });
          }, tables[t]);
          
          rows.forEach((row, i) => {
            console.log(`     Row ${i + 1}: ${row.join(' | ')}`);
          });
        }
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('✨ Test completed!');
    console.log('═'.repeat(60) + '\n');
    
    await askUser('Press ENTER to close the browser... ');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testScraping();
