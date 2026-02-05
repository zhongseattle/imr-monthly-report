#!/usr/bin/env tsx

/**
 * Test Date Logic for Month Calculations
 * Simulates running the script on different dates
 */

function calculateMonthsElapsed_OLD(testDate: Date): number {
  const currentMonth = testDate.getMonth() + 1; // 1-12 (January = 1)
  
  // OLD LOGIC: Based on current month
  if (currentMonth === 1) {
    return 12;
  }
  return currentMonth - 1;
}

function calculateMonthsElapsed_NEW(testDate: Date): number {
  const currentMonth = testDate.getMonth() + 1; // 1-12 (January = 1)
  
  // NEW LOGIC: Report is for PREVIOUS month, Fiscal year = Calendar year
  let reportingMonth = currentMonth - 1;
  
  if (reportingMonth === 0) {
    reportingMonth = 12;
  }
  
  // Calendar year: reporting month IS the fiscal months elapsed
  return reportingMonth;
}

function getReportMonth_OLD(testDate: Date): string {
  return testDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function getReportMonth_NEW(testDate: Date): string {
  const previousMonth = new Date(testDate);
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  return previousMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function getFiscalMonthName(monthsElapsed: number): string {
  const fiscalMonths = [
    '', // placeholder for index 0
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return fiscalMonths[monthsElapsed] || 'Unknown';
}

console.log('\n════════════════════════════════════════════════════════════════');
console.log('DATE LOGIC TEST - Old vs New Calculation');
console.log('════════════════════════════════════════════════════════════════\n');

const testDates = [
  new Date('2026-01-06'),  // Jan 6, 2026
  new Date('2026-01-31'),  // Jan 31, 2026 (today)
  new Date('2026-02-01'),  // Feb 1, 2026
  new Date('2026-02-06'),  // Feb 6, 2026 (typical run date)
  new Date('2026-03-06'),  // Mar 6, 2026
  new Date('2026-04-06'),  // Apr 6, 2026
];

testDates.forEach(date => {
  const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const oldMonths = calculateMonthsElapsed_OLD(date);
  const newMonths = calculateMonthsElapsed_NEW(date);
  
  const oldReport = getReportMonth_OLD(date);
  const newReport = getReportMonth_NEW(date);
  
  const fiscalMonth = getFiscalMonthName(newMonths);
  
  console.log(`📅 Run Date: ${dateStr}`);
  console.log(`   OLD: Report="${oldReport}", monthsElapsed=${oldMonths}, Fiscal Month=${getFiscalMonthName(oldMonths)}`);
  console.log(`   NEW: Report="${newReport}", monthsElapsed=${newMonths}, Fiscal Month=${fiscalMonth}`);
  
  // Sample calculation with $150,900 YTD
  const ytd = 150900;
  const projectedOld = (ytd / oldMonths) * 12;
  const projectedNew = (ytd / newMonths) * 12;
  
  console.log(`   OLD Projected EOY: $${projectedOld.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
  console.log(`   NEW Projected EOY: $${projectedNew.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
  console.log();
});

console.log('════════════════════════════════════════════════════════════════');
console.log('KEY INSIGHT:');
console.log('════════════════════════════════════════════════════════════════');
console.log('When run on Feb 6, 2026:');
console.log('  • Report covers: January 2026 (fiscal month 1 of FY2026)');
console.log('  • monthsElapsed: 1');
console.log('  • Projected EOY = (YTD / 1) × 12 = YTD × 12');
console.log();
console.log('When run on Dec 6, 2026:');
console.log('  • Report covers: November 2026 (fiscal month 11 of FY2026)');
console.log('  • monthsElapsed: 11');
console.log('  • Projected EOY = (YTD / 11) × 12');
console.log();
console.log('When run on Jan 6, 2027:');
console.log('  • Report covers: December 2026 (fiscal month 12 of FY2026)');
console.log('  • monthsElapsed: 12');
console.log('  • This represents the FULL fiscal year data');
console.log('  • Projected EOY = YTD (no projection needed)');
console.log('════════════════════════════════════════════════════════════════\n');
