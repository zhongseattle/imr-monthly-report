#!/usr/bin/env node

/**
 * Cerberus Scraper Test Utility (Standalone)
 * Runs independently without Next.js compilation
 */

const puppeteer = require('puppeteer');
const fs = require('fs/promises');
const path = require('path');

// Configuration
const CERBERUS_URL = process.env.CERBERUS_URL || 'https://cerberus.cloudtune.amazon.dev';
const TEST_FLEET_ID = process.env.TEST_FLEET_ID || '8304669';
const BROWSER_SESSION_DIR = path.join(process.cwd(), '.browser-session');

function buildCerberusUrl(fleetId, billingPeriod) {
  const now = new Date();
  const defaultBillingPeriod = billingPeriod || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  
  const url = new URL('/usage', CERBERUS_URL);
  url.searchParams.set('fleetId', fleetId);
  url.searchParams.set('billingPeriod', defaultBillingPeriod);
  url.searchParams.set('activeTab', 'usage-imr-goal');
  
  return url.toString();
}

async function testAuth() {
  console.log('\n🔐 Testing Authentication...\n');
  console.log(`Cerberus URL: ${CERBERUS_URL}`);
  console.log(`Test Fleet ID: ${TEST_FLEET_ID}\n`);
  
  let browser;
  try {
    // Ensure session directory exists
    try {
      await fs.access(BROWSER_SESSION_DIR);
    } catch {
      await fs.mkdir(BROWSER_SESSION_DIR, { recursive: true });
    }
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: false,
      userDataDir: BROWSER_SESSION_DIR,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    const fleetUrl = buildCerberusUrl(TEST_FLEET_ID);
    console.log(`Navigating to: ${fleetUrl}\n`);
    
    await page.goto(fleetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait a bit to see what happens
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if we're on a login page
    const hasPasswordInput = await page.$('input[type="password"]');
    const hasLoginForm = await page.$('.login-form, #login, [name="username"]');
    
    if (hasPasswordInput || hasLoginForm) {
      console.log('⚠️  Login page detected.');
      console.log('\n===========================================');
      console.log('MANUAL LOGIN REQUIRED');
      console.log('===========================================');
      console.log('\nPlease complete the SSO authentication in the browser window.');
      console.log('Press Ctrl+C when done (session will be saved).');
      console.log('===========================================\n');
      
      // Keep browser open
      await new Promise(() => {}); // Wait indefinitely
    } else {
      console.log('✅ Already authenticated or no login required!');
      console.log('✅ Session is saved and ready for scraping.');
      
      // Take a quick screenshot
      const screenshotPath = path.join(process.cwd(), 'debug', 'auth-test.png');
      await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath });
      console.log(`\n📸 Screenshot saved to: ${screenshotPath}`);
    }
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function takeScreenshot() {
  console.log('\n📸 Taking Screenshot...\n');
  
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
    console.log(`Navigating to: ${fleetUrl}\n`);
    
    await page.goto(fleetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const outputPath = path.join(process.cwd(), 'debug', `fleet-${TEST_FLEET_ID}-screenshot.png`);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await page.screenshot({ path: outputPath, fullPage: true });
    
    console.log(`✅ Screenshot saved to: ${outputPath}\n`);
  } catch (error) {
    console.error('❌ Screenshot failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function extractHTML() {
  console.log('\n📄 Extracting Page HTML...\n');
  
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
    console.log(`Navigating to: ${fleetUrl}\n`);
    
    await page.goto(fleetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const html = await page.content();
    
    const outputPath = path.join(process.cwd(), 'debug', `fleet-${TEST_FLEET_ID}-page.html`);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, html, 'utf-8');
    
    console.log(`✅ HTML saved to: ${outputPath}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Open the HTML file in your browser or editor');
    console.log('   2. Inspect the structure and identify selectors');
    console.log('   3. Update SELECTORS in lib/services/cerberus-scraper.ts');
    console.log('   4. Test scraping functions\n');
  } catch (error) {
    console.error('❌ HTML extraction failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function showHelp() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   Cerberus Scraper Test Utility                   ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  console.log('Usage: npm run test-scraper <command>\n');
  console.log('Available commands:\n');
  console.log('  test-auth            Test SSO authentication');
  console.log('  screenshot           Take a screenshot of the fleet page');
  console.log('  extract-html         Extract and save page HTML for analysis');
  console.log('\nEnvironment variables:');
  console.log('  CERBERUS_URL       Base URL for Cerberus');
  console.log('  TEST_FLEET_ID      Fleet ID to test with');
  console.log('\nExamples:');
  console.log('  npm run test-scraper test-auth');
  console.log('  npm run test-scraper screenshot');
  console.log('  TEST_FLEET_ID=8304670 npm run test-scraper extract-html\n');
}

// Main execution
(async () => {
  const command = process.argv[2];
  
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    await showHelp();
    process.exit(0);
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log(`Cerberus Base URL: ${CERBERUS_URL}`);
  console.log(`Test Fleet ID: ${TEST_FLEET_ID}`);
  console.log('═'.repeat(50));
  
  try {
    switch (command) {
      case 'test-auth':
        await testAuth();
        break;
      case 'screenshot':
        await takeScreenshot();
        break;
      case 'extract-html':
        await extractHTML();
        break;
      default:
        console.error(`\n❌ Unknown command: ${command}\n`);
        await showHelp();
        process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
})();
