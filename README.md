# IMR Budget Forecaster

A Next.js web application that uses web scraping to retrieve budget and spend data from Cerberus, analyzing year-to-date spending, calculating burn rates, and forecasting end-of-year spend for fleets.

## Features

- **Fleet Budget Analysis**: View budget allocations and current spending for any fleet
- **YTD Spend Calculation**: Calculate year-to-date spending with fiscal year awareness (Feb 1 - Jan 31)
- **Burn Rate Analysis**: Calculate monthly and daily burn rates to understand spending patterns
- **EOY Forecasting**: Project end-of-year spending based on current burn rates
- **Budget Variance**: Compare forecasted spend against allocated budget
- **Fleet Hierarchy**: Aggregate data from parent fleets and all sub-fleets
- **Interactive Charts**: Visualize monthly spending trends and burn rates
- **Dark Mode Support**: Toggle between light and dark themes
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Date Handling**: date-fns
- **Runtime**: Node.js 18+

## Getting Started

### Prerequisites

- Node.js 18.0 or higher
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd imr-budget-forecaster
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (see [Environment Variables](#environment-variables) section)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test-cerberus` - Test Cerberus scraping (all 6 fleets)
- `npm run scrape-monthly-report` - Generate monthly budget report

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Cerberus Configuration
CERBERUS_URL=https://cerberus.cloudtune.amazon.dev

# Production Fleet IDs (comma-separated, no spaces)
FLEET_IDS=8304669,8305082,8304674,10089347,8967127,3046715

# Optional: Browser Configuration
HEADLESS_MODE=false  # Set to 'true' for production automation
```

See `.env.example` for a template.

## Web Scraping Strategy

The IMR Budget Forecaster uses **dual-period web scraping** to extract budget and spend data from Cerberus, Amazon's internal fleet management tool.

### Why Web Scraping?

Cerberus does not provide a public API, so we use Puppeteer-based web scraping to automatically extract financial data for monthly reporting.

### Dual-Period Approach

Cerberus displays different metrics depending on the selected time period:

- **"Full Year" view** → Contains IMR Goal (annual budget)
- **"Year to Date" view** → Contains YTD Actual Spend

Our scraper navigates to both views sequentially to collect complete data.

### Available Scripts

```bash
# Test scraping with all production fleets (opens browser for debugging)
npm run test-cerberus

# Run monthly report (saves JSON files and summary)
npm run scrape-monthly-report
```

### First-Time Setup

1. Configure fleet IDs in `.env.local` (see above)
2. Run test script: `npm run test-cerberus`
3. Browser opens automatically - complete SSO authentication
4. Session saved to `.browser-session/` for future runs

### Monthly Report Output

Reports are saved to `reports/YYYY-MM-DD/`:

```
reports/2026-01-06/
├── fleet-8304669.json      # Individual fleet data
├── fleet-8305082.json
├── fleet-8304674.json
├── fleet-10089347.json
├── fleet-8967127.json
├── fleet-3046715.json
└── summary-report.txt      # Human-readable summary
```

### Documentation

For detailed implementation and troubleshooting:

- **`CERBERUS_DUAL_PERIOD_IMPLEMENTATION.md`** - Complete technical guide
- **`CERBERUS_SELECTORS.md`** - CSS selector reference
- **`DEPLOYMENT.md`** - Production setup and automation
- **`SCRAPING_SETUP.md`** - Original setup instructions

### Performance

- **Single fleet**: ~15-20 seconds
- **All 6 fleets**: ~2-3 minutes
- **Timing**: 3-second waits after period switches (no URL change)

### Key Features

- **SSO Authentication**: Manual login on first run, session persists
- **Error Handling**: Falls back to mock data if scraping fails
- **Currency Parsing**: Handles $2.36MM, $150.9K, $1.5M formats
- **Automatic Calculations**: Burn rate, projected EOY, variance
- **Fiscal Year Aware**: FY2026 = Feb 1, 2025 - Jan 31, 2026

## Application Structure

```
imr-budget-forecaster/
├── app/                          # Next.js app directory
│   ├── layout.tsx               # Root layout with dark mode
│   ├── page.tsx                 # Dashboard page
│   └── globals.css              # Global styles
├── components/
│   └── dashboard/               # Dashboard components
│       ├── BurnRateChart.tsx    # Monthly burn rate visualization
│       ├── ForecastDisplay.tsx  # Main forecast results display
│       └── StatCard.tsx         # Individual metric cards
├── lib/
│   ├── services/
│   │   ├── cerberus-scraper.ts      # Web scraping implementation
│   │   ├── cerebus-api.ts           # API integration layer
│   │   └── forecast-calculator.ts   # Main calculation orchestrator
│   ├── utils/
│   │   ├── calculations.ts          # Core calculation functions
│   │   ├── date-utils.ts            # Date formatting utilities
│   │   └── fiscal-year.ts           # Fiscal year utilities
│   └── types.ts                     # TypeScript type definitions
├── scripts/
│   ├── test-cerberus-complete.js    # Scraping test script
│   └── scrape-monthly-report.js     # Monthly automation script
└── public/                          # Static assets
```

## Key Calculation Logic

### Requirement 3: YTD Spend Calculation
- Aggregates all spend data from fiscal year start to current date
- Includes spend from parent fleet and all sub-fleets
- Location: `lib/utils/calculations.ts:calculateYTDSpend()`

### Requirement 4: Monthly Burn Rate
- Calculates total spend and average daily burn rate per month
- Helps identify spending patterns and seasonality
- Location: `lib/utils/calculations.ts:calculateDailyBurnRateByMonth()`

### Requirement 5: EOY Forecast
- Projects end-of-year spend based on recent burn rates
- Uses last 3 months of data for trend analysis
- Location: `lib/utils/calculations.ts:forecastEOYSpend()`

### Requirement 6: Budget Variance
- Compares forecasted spend against allocated budget
- Calculates variance percentage and flags over/under budget
- Location: `lib/utils/calculations.ts:compareAgainstBudget()`

### Requirement 7: Fleet Hierarchy Aggregation
- Recursively aggregates budget and spend data from all sub-fleets
- Maintains parent-child relationships
- Location: `lib/utils/calculations.ts:aggregateFleetData()`

### Requirement 8: Fiscal Year Handling
- Amazon fiscal year: February 1 - January 31
- All date calculations respect fiscal year boundaries
- Location: `lib/utils/fiscal-year.ts`

## Testing

### Manual Testing with Mock Data

The application includes mock data for three test fleets:

1. **Fleet 8304669**: Under budget scenario
   - Budget: $1,000,000
   - Forecasted: ~$900,000

2. **Fleet 8304670**: Over budget scenario
   - Budget: $500,000
   - Forecasted: ~$550,000

3. **Fleet 8304671**: On track scenario
   - Budget: $750,000
   - Forecasted: ~$745,000

Test these fleet IDs in the dashboard to verify functionality.

### Unit Testing (Future Enhancement)

Consider adding:
- Jest for unit tests
- React Testing Library for component tests
- Mock Service Worker for API testing

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Deploy to Other Platforms

The application can be deployed to any platform that supports Next.js:

- AWS Amplify
- Netlify
- Railway
- Render
- Self-hosted with Docker

See [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for platform-specific instructions.

## Future Enhancements

### Planned Features

- **Historical Trend Analysis**: Compare current year spending with previous years
- **Multi-Fleet Comparison**: Side-by-side comparison of multiple fleets
- **Budget Adjustment Scenarios**: "What-if" analysis for budget changes
- **Email Alerts**: Notifications for budget overruns
- **Export Functionality**: Generate PDF/CSV reports
- **Fleet Bookmarks**: Save frequently accessed fleets
- **Admin Panel**: Manage fiscal year settings and thresholds

### Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## Troubleshooting

### Common Issues

**Issue**: Cannot connect to localhost
- **Solution**: Try using `http://127.0.0.1:3000` instead of `localhost:3000`

**Issue**: "Module not found" errors
- **Solution**: Delete `node_modules` and `.next`, then run `npm install`

**Issue**: TypeScript errors
- **Solution**: Run `npm run build` to see all type errors, fix them incrementally

**Issue**: Environment variables not loading
- **Solution**: Ensure `.env.local` exists and restart dev server

## License

[Your License Here]

## Support

For questions or issues, please contact [your-contact-info] or open an issue on GitHub.

## Acknowledgments

- Built with [Next.js](https://nextjs.org)
- Charts powered by [Recharts](https://recharts.org)
- Icons and styling with [Tailwind CSS](https://tailwindcss.com)
