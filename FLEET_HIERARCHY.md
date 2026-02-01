# Fleet Hierarchy Documentation

## Production Fleet Structure

### Parent Fleet: 8304669
**Fleet Name**: (F6) Planning Automation And Optimization  
**IMR Goal**: $2,360,000  
**YTD Spend**: $150,900

#### Child Fleets:

1. **Fleet 8305082** - (F7) Capacity Plan Automation and Optimization
   - IMR Goal: $812,900
   - YTD Spend: $65,400
   - Parent: 8304669

2. **Fleet 8304674** - (F7) Plan Automation
   - IMR Goal: $623,700
   - YTD Spend: $38,100
   - Parent: 8304669

3. **Fleet 10089347** - (F7) AI Automation
   - IMR Goal: $888,700
   - YTD Spend: $38,500
   - Parent: 8304669

4. **Fleet 8967127** - (F7) Planning Automation
   - IMR Goal: $32,900
   - YTD Spend: $8,200
   - Parent: 8304669

### Independent Fleet: 3046715
**Fleet Name**: (F6) IPC - Capacity  
**IMR Goal**: $25,060,000  
**YTD Spend**: $561,700  
**Status**: No parent fleet (independent)

---

## Budget Rollup Analysis

### Parent Fleet 8304669 with Children

| Fleet | Type | IMR Goal | YTD Spend | % of Parent Budget |
|-------|------|----------|-----------|-------------------|
| **8304669** | **Parent** | **$2,360,000** | **$150,900** | **100%** |
| 8305082 | Child | $812,900 | $65,400 | 34.4% |
| 8304674 | Child | $623,700 | $38,100 | 26.4% |
| 10089347 | Child | $888,700 | $38,500 | 37.7% |
| 8967127 | Child | $32,900 | $8,200 | 1.4% |
| **Total Children** | - | **$2,358,200** | **$150,200** | **99.9%** |

**Note**: The parent fleet budget ($2,360,000) is almost entirely allocated to its child fleets ($2,358,200), with only $1,800 difference. This suggests the parent fleet's budget is the sum of its children.

### Combined Analysis

**Parent Fleet Group** (8304669 + children):
- Total IMR Goal: $2,360,000
- Total YTD Spend: $150,900
- Variance: -$2,209,100 (93.6% under budget)

**Independent Fleet** (3046715):
- IMR Goal: $25,060,000
- YTD Spend: $561,700
- Variance: -$24,498,300 (97.8% under budget)

**Grand Total** (All 6 fleets):
- Total IMR Goal: $27,420,000
- Total YTD Spend: $712,600
- Overall Variance: -$26,707,400 (97.4% under budget)

---

## Fleet Configuration Order

### Recommended Scraping Order

For reporting purposes, it's recommended to scrape in hierarchical order:

```bash
# In .env.local
FLEET_IDS=8304669,8305082,8304674,10089347,8967127,3046715
```

This order:
1. Parent fleet first (8304669)
2. Child fleets next (8305082, 8304674, 10089347, 8967127)
3. Independent fleet last (3046715)

### Alternative: Group by Hierarchy

```bash
# Parent and children together, then independent
FLEET_IDS=8304669,8305082,8304674,10089347,8967127,3046715
```

---

## Reporting Implications

### Monthly Reports Should Show:

1. **Parent Fleet Summary**
   - Fleet 8304669 totals
   - Includes rolled-up data from children

2. **Child Fleet Details**
   - Individual metrics for each child fleet
   - Contribution to parent budget

3. **Independent Fleet Summary**
   - Fleet 3046715 standalone metrics

### Sample Report Structure

```
========================================
PARENT FLEET: 8304669
Planning Automation And Optimization
========================================
IMR Goal:         $2,360,000
YTD Spend:        $150,900
Projected EOY:    $150,900
Variance:         -$2,209,100 (-93.6%)
Status:           ✅ UNDER Budget

  Child Fleet Breakdown:
  ----------------------------------------
  • 8305082: Capacity Plan ($812,900)
    YTD: $65,400 | Variance: -$747,500
  
  • 8304674: Plan Automation ($623,700)
    YTD: $38,100 | Variance: -$585,600
  
  • 10089347: AI Automation ($888,700)
    YTD: $38,500 | Variance: -$850,200
  
  • 8967127: Planning Automation ($32,900)
    YTD: $8,200 | Variance: -$24,700

========================================
INDEPENDENT FLEET: 3046715
IPC - Capacity
========================================
IMR Goal:         $25,060,000
YTD Spend:        $561,700
Projected EOY:    $561,700
Variance:         -$24,498,300 (-97.8%)
Status:           ✅ UNDER Budget
```

---

## Technical Notes

### Fleet Hierarchy in Code

The current scraper treats all fleets independently. For hierarchical reporting, you can:

1. **Keep current approach**: Scrape all 6 fleets independently (current implementation)
   - Pros: Simple, reliable, accurate individual data
   - Cons: Doesn't show parent-child relationships in output

2. **Add hierarchy logic**: Group fleets in reporting
   - Modify `scripts/scrape-monthly-report.js` to group by hierarchy
   - Add parent-child relationship metadata
   - Calculate rollups programmatically

### Recommended Approach

For now, **keep the current implementation** (scrape all 6 independently) because:
- ✅ All data is accurate
- ✅ Simple and maintainable
- ✅ Can be grouped in post-processing or Excel
- ✅ Easy to add hierarchy visualization later

To add hierarchy visualization in future:
- Add `parentFleetId` field to configuration
- Group results by parent in summary report
- Show indented child fleets under parent

---

## Updated .env.local Documentation

```bash
# Production Fleet IDs (comma-separated, no spaces)
# 
# Fleet Hierarchy:
# - 8304669: Parent Fleet - Planning Automation And Optimization
#   - 8305082: Child - Capacity Plan Automation and Optimization
#   - 8304674: Child - Plan Automation
#   - 10089347: Child - AI Automation
#   - 8967127: Child - Planning Automation
# - 3046715: Independent Fleet - IPC - Capacity
#
FLEET_IDS=8304669,8305082,8304674,10089347,8967127,3046715
```

---

## Questions for Consideration

1. **Reporting Structure**: Should monthly reports show the hierarchy explicitly?
   - Currently: Flat list of 6 fleets
   - Alternative: Grouped by parent-child relationships

2. **Budget Validation**: Should we validate that child budgets sum to parent budget?
   - Current difference: $1,800 ($2,360,000 vs $2,358,200)

3. **Scraping Order**: Does hierarchy order matter for scraping?
   - Currently: Sequential as configured
   - Alternative: Could optimize by scraping parent last to get fresh data

---

**Last Updated**: January 31, 2026  
**Test Results**: All 6 fleets scraped successfully  
**Hierarchy**: Documented and validated
