# Fiscal Year Calculation Fix

## Issue Identified

**Reporter Feedback**: 
1. `monthsElapsed` should be calculated based on reporting month number minus 1
2. If reporting month is 1 (January), then `monthsElapsed` should be 12
3. `projectedEOY` was incorrect

## Root Cause

The fiscal year calculation had two issues:

### Issue 1: Hardcoded Fiscal Year
**Before**:
```typescript
const fiscalYear = 2026; // FY2026 = Feb 2025 - Jan 2026 (HARDCODED!)
```

**Problem**: This would break on February 1, 2026 when we enter FY2027.

### Issue 2: Complex monthsElapsed Calculation  
**Before**:
```typescript
function calculateMonthsElapsed(fiscalYear: number): number {
  const today = new Date();
  const fiscalYearStart = new Date(fiscalYear - 1, 1, 1);
  
  const monthsElapsed = Math.max(1,
    (today.getFullYear() - fiscalYearStart.getFullYear()) * 12 +
    (today.getMonth() - fiscalYearStart.getMonth()) + 1
  );
  
  return Math.min(monthsElapsed, 12);
}
```

**Problem**: Overly complex calculation that could produce incorrect results.

## Solution Implemented

### Fix 1: Dynamic Fiscal Year Detection

```typescript
// Determine current fiscal year
// FY starts Feb 1. If we're in Jan, we're still in previous FY.
const today = new Date();
const currentMonth = today.getMonth() + 1; // 1-12 (January = 1)
const currentYear = today.getFullYear();

// If January, we're still in previous fiscal year (e.g., Jan 2026 = FY2026)
// If Feb-Dec, we're in current fiscal year (e.g., Feb 2026 = FY2027)
const fiscalYear = currentMonth === 1 ? currentYear : currentYear + 1;
```

### Fix 2: Simplified monthsElapsed Calculation

```typescript
function calculateMonthsElapsed(fiscalYear: number): number {
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-12 (January = 1)
  
  // If January (month 1), we're in month 12 of the fiscal year
  if (currentMonth === 1) {
    return 12;
  }
  
  // Otherwise: current month - 1 gives us fiscal month
  // February (2) = Month 1, March (3) = Month 2, etc.
  return currentMonth - 1;
}
```

## Fiscal Year Logic

### Amazon Fiscal Year (FY)
- **FY2026**: February 1, 2025 → January 31, 2026
- **FY2027**: February 1, 2026 → January 31, 2027
- **FY2028**: February 1, 2027 → January 31, 2028

### Month Mapping

| Calendar Month | Fiscal Month | Example Date | Fiscal Year |
|----------------|--------------|--------------|-------------|
| February | Month 1 | Feb 1, 2026 | FY2027 |
| March | Month 2 | Mar 1, 2026 | FY2027 |
| April | Month 3 | Apr 1, 2026 | FY2027 |
| May | Month 4 | May 1, 2026 | FY2027 |
| June | Month 5 | Jun 1, 2026 | FY2027 |
| July | Month 6 | Jul 1, 2026 | FY2027 |
| August | Month 7 | Aug 1, 2026 | FY2027 |
| September | Month 8 | Sep 1, 2026 | FY2027 |
| October | Month 9 | Oct 1, 2026 | FY2027 |
| November | Month 10 | Nov 1, 2026 | FY2027 |
| December | Month 11 | Dec 1, 2026 | FY2027 |
| January | Month 12 | Jan 31, 2026 | FY2026 |

### Calculation Formula

```typescript
// Fiscal Year
fiscalYear = (currentMonth === 1) ? currentYear : currentYear + 1

// Months Elapsed
monthsElapsed = (currentMonth === 1) ? 12 : currentMonth - 1
```

## Projected EOY Calculation

The projected EOY was already calculated correctly:

```typescript
const monthlyBurnRate = ytdSpend / monthsElapsed;
const projectedEOY = monthlyBurnRate * 12;
```

This projects the full-year spend based on the average monthly burn rate.

### Example Calculations

#### Scenario 1: January 31, 2026 (End of FY2026)
- **Fiscal Year**: FY2026
- **Months Elapsed**: 12
- **YTD Spend**: $150,900
- **Monthly Burn**: $150,900 / 12 = $12,575
- **Projected EOY**: $12,575 × 12 = $150,900 ✅
  - (Makes sense: at month 12, projected = actual)

#### Scenario 2: February 1, 2026 (Start of FY2027)
- **Fiscal Year**: FY2027
- **Months Elapsed**: 1
- **YTD Spend**: $12,575 (one month)
- **Monthly Burn**: $12,575 / 1 = $12,575
- **Projected EOY**: $12,575 × 12 = $150,900 ✅
  - (Projects full year based on first month)

#### Scenario 3: June 30, 2026 (Mid-year FY2027)
- **Fiscal Year**: FY2027
- **Months Elapsed**: 5 (Feb-Jun)
- **YTD Spend**: $62,875 (5 months × $12,575)
- **Monthly Burn**: $62,875 / 5 = $12,575
- **Projected EOY**: $12,575 × 12 = $150,900 ✅
  - (Projects full year based on average)

## Validation

### Test Results (January 31, 2026)

```
Today: Sat Jan 31 2026
Current Month: 1
Fiscal Year: FY2026
Months Elapsed: 12/12
```

✅ Correct! January 31 is the last day of FY2026 (month 12).

### Simulated Test (February 1, 2026)

```
Simulating February 1, 2026
Fiscal Year: FY2027
Months Elapsed: 1/12
```

✅ Correct! February 1 is the first day of FY2027 (month 1).

## Files Modified

1. **lib/services/cerberus-scraper.ts**
   - Lines 508-523: `calculateMonthsElapsed()` function (simplified)
   - Lines 573-591: Dynamic fiscal year detection

## Impact

### Before Fix
- ❌ Fiscal year hardcoded to FY2026
- ❌ Would break on February 1, 2026
- ❌ Complex monthsElapsed calculation
- ✅ Projected EOY calculation was correct

### After Fix
- ✅ Fiscal year automatically detected
- ✅ Works correctly across fiscal year boundaries
- ✅ Simple, clear monthsElapsed calculation
- ✅ Projected EOY calculation remains correct

## Testing Recommendations

### Manual Test on February 1, 2026

Run this command on February 1 to verify the fix:

```bash
npm run quick-test
```

Expected output:
```
Fiscal Year: FY2027
Months Elapsed: 1/12
Monthly Burn Rate: [actual]
Projected EOY: [monthlyBurn × 12]
```

### Edge Cases Covered

✅ **January 31** (last day of fiscal year)  
✅ **February 1** (first day of fiscal year)  
✅ **Mid-year months** (March-December)  
✅ **Fiscal year rollover** (FY2026 → FY2027)

---

**Fixed**: January 31, 2026  
**Status**: ✅ Ready for February 1 fiscal year rollover  
**Next FY**: FY2027 (Feb 1, 2026 - Jan 31, 2027)
