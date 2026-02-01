#!/usr/bin/env node

/**
 * Test Cerberus scraping with actual selectors
 */

const puppeteer = require('puppeteer');
const path = require('path');

const CERBERUS_URL = process.env.CERBERUS_URL || 'https://cerberus.cloudtune.amazon.dev';
const TEST_FLEET_ID = process.env.TEST_FLEET_ID || '8304669';
const BROWSER_SESSION_DIR = path.join(process.cwd(), '.browser-session');

// Actual Cerberus selectors
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
  
  // Handle MM format
  if (cleaned.toUpperCase().endsWith('MM')) {
    cleaned = cleaned.slice(0, -2);
    return parseFloat(cleaned) * 1000000;
  }
  
  // Handle K, M, B
  const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
  const lastChar = cleaned.slice(-1).toUpperCase();
  if (multipliers[lastChar]) {
    cleaned = cleaned.slice(0, -1);
    return parseFloat(cleaned) * multipliers[lastChar];
  }
  
  return parseFloat(cleaned) || 0;
}

async function testScraping() {
  console.log('\n🧪 Testing Cerberus Scraping with Real Selectors\n');
  console.log('═'.repeat(60));
  console.log(`Fleet ID: ${TEST_FLEET_ID}`);
  console.log(`URL: ${buildCerberusUrl(TEST_FLEET_ID)}`);
  console.log('═'.repeat(60) + '\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      userDataDir: BROWSER_SESSION_DIR,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    const fleetUrl = buildCerberusUrl(TEST_FLEET_ID);
    console.log('📡 Navigating to Cerberus...');
    await page.goto(fleetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait longer for SSO redirect to complete and page to fully load
    console.log('⏳ Waiting for page to fully load (SSO redirect may take time)...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('midway-auth') || currentUrl.includes('login')) {
      console.log('\n⚠️  Still on SSO/login page. Please check:');
      console.log('   1. Complete login in the browser window');
      console.log('   2. Make sure session is saved');
      console.log('   3. Try running: npm run test-scraper test-auth first\n');
      return;
    }
    
    console.log('✅ Page loaded\n');
    
    // Test Fleet Name
    console.log('🔍 Testing Fleet Name selector...');
    try {
      const fleetName = await page.$eval(SELECTORS.fleetName, el => el.textContent.trim());
      console.log(`   ✅ Fleet Name: ${fleetName}`);
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
    
    // Test Fleet ID
    console.log('\n🔍 Testing Fleet ID selector...');
    try {
      const fleetIdText = await page.$eval(SELECTORS.fleetId, el => el.textContent.trim());
      console.log(`   ✅ Fleet ID: ${fleetIdText}`);
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
    
    // Test Budget (IMR Goal)
    console.log('\n🔍 Testing Budget selector...');
    try {
      const budgetText = await page.$eval(SELECTORS.totalBudget, el => el.textContent.trim());
      const budgetAmount = parseCurrency(budgetText);
      console.log(`   ✅ Budget Text: ${budgetText}`);
      console.log(`   ✅ Budget Parsed: $${budgetAmount.toLocaleString()}`);
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
    
    // Test Current Spend
    console.log('\n🔍 Testing Current Spend selector...');
    try {
      const spendElements = await page.$$(SELECTORS.currentSpend);
      console.log(`   Found ${spendElements.length} elements with .mus-cell-right-aligned`);
      
      for (let i = 0; i < Math.min(5, spendElements.length); i++) {
        const text = await page.evaluate(el => el.textContent.trim(), spendElements[i]);
        const amount = parseCurrency(text);
        console.log(`   [${i}] Text: ${text} → Parsed: $${amount.toLocaleString()}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
    
    // Test Usage Table
    console.log('\n🔍 Testing Usage Table...');
    try {
      const tables = await page.$$('table');
      console.log(`   Found ${tables.length} table(s) on page`);
      
      if (tables.length > 0) {
        console.log('\n   Inspecting first table:');
        const rows = await page.$$('table tbody tr');
        console.log(`   Found ${rows.length} rows in table`);
        
        // Show first 3 rows
        for (let i = 0; i < Math.min(3, rows.length); i++) {
          const cells = await page.evaluate(row => {
            return Array.from(row.querySelectorAll('td')).map(cell => cell.textContent.trim());
          }, rows[i]);
          console.log(`   Row ${i + 1}: ${cells.join(' | ')}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('✨ Test completed!');
    console.log('═'.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testScraping();
