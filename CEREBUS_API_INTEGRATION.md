# Cerebus API Integration Guide

This guide provides detailed instructions for integrating the IMR Budget Forecaster with the actual Cerebus API.

## Overview

The application currently uses mock data in `lib/services/cerebus-api.ts`. This guide will help you replace the mock implementation with real API calls.

## Prerequisites

Before starting the integration:

1. **API Access**: Ensure you have access to the Cerebus API
2. **API Documentation**: Have the Cerebus API documentation available
3. **Authentication**: Obtain API credentials (URL and API key)
4. **Test Fleet IDs**: Identify valid fleet IDs for testing

## Step-by-Step Integration

### Step 1: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your actual credentials:
   ```bash
   CEREBUS_API_URL=https://actual-cerebus-api.amazon.com
   CEREBUS_API_KEY=your_actual_api_key_here
   CEREBUS_TIMEOUT=30000
   ```

3. Restart the development server after updating environment variables

### Step 2: Understand the Expected Data Structures

The application expects the following data structures from the Cerebus API:

#### Budget Data Structure
```typescript
interface CerebusBudgetData {
  fleetId: string;
  fleetName: string;
  fiscalYear: number;
  totalBudget: number;  // Total allocated budget in dollars
  currency: string;     // e.g., "USD"
}
```

#### Spend Data Structure
```typescript
interface CerebusSpendData {
  date: string;         // ISO 8601 format: "2025-01-15"
  amount: number;       // Spend amount in dollars
  category?: string;    // Optional: spending category
  description?: string; // Optional: transaction description
}
```

#### Fleet Hierarchy Structure
```typescript
interface FleetData {
  fleetId: string;
  fleetName: string;
  parentFleetId?: string;
  subFleets: FleetData[];  // Recursive structure
  budgetData?: CerebusBudgetData;
  spendData?: CerebusSpendData[];
}
```

### Step 3: Update the API Client

Edit `lib/services/cerebus-api.ts`:

#### A. Update Imports and Configuration

```typescript
const CEREBUS_BASE_URL = process.env.CEREBUS_API_URL || '';
const CEREBUS_API_KEY = process.env.CEREBUS_API_KEY || '';
const CEREBUS_TIMEOUT = parseInt(process.env.CEREBUS_TIMEOUT || '30000', 10);

// Helper function for API calls
async function fetchFromCerebus(endpoint: string, options: RequestInit = {}) {
  const url = `${CEREBUS_BASE_URL}${endpoint}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CEREBUS_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${CEREBUS_API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cerebus API error (${response.status}): ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Cerebus API request timed out');
    }
    throw error;
  }
}
```

#### B. Implement getBudgetData

Replace the mock implementation:

```typescript
export async function getBudgetData(fleetId: string): Promise<CerebusBudgetData> {
  try {
    // Adjust the endpoint based on actual Cerebus API documentation
    const data = await fetchFromCerebus(`/api/v1/fleets/${fleetId}/budget`);
    
    // Transform the response if needed to match our data structure
    return {
      fleetId: data.fleet_id || data.fleetId,
      fleetName: data.fleet_name || data.fleetName,
      fiscalYear: data.fiscal_year || data.fiscalYear,
      totalBudget: parseFloat(data.total_budget || data.totalBudget || 0),
      currency: data.currency || 'USD',
    };
  } catch (error) {
    console.error(`Failed to fetch budget data for fleet ${fleetId}:`, error);
    throw new Error(`Unable to retrieve budget data for fleet ${fleetId}`);
  }
}
```

#### C. Implement getSpendData

Replace the mock implementation:

```typescript
export async function getSpendData(
  fleetId: string,
  startDate: Date,
  endDate: Date
): Promise<CerebusSpendData[]> {
  try {
    const params = new URLSearchParams({
      fleet_id: fleetId,
      start_date: startDate.toISOString().split('T')[0], // "2025-02-01"
      end_date: endDate.toISOString().split('T')[0],     // "2026-01-31"
    });
    
    // Adjust the endpoint based on actual Cerebus API documentation
    const data = await fetchFromCerebus(`/api/v1/spend?${params}`);
    
    // Transform the response array if needed
    return (data.transactions || data.records || data).map((item: any) => ({
      date: item.date || item.transaction_date,
      amount: parseFloat(item.amount || item.spend || 0),
      category: item.category || undefined,
      description: item.description || undefined,
    }));
  } catch (error) {
    console.error(`Failed to fetch spend data for fleet ${fleetId}:`, error);
    throw new Error(`Unable to retrieve spend data for fleet ${fleetId}`);
  }
}
```

#### D. Implement getFleetHierarchy

Replace the mock implementation:

```typescript
export async function getFleetHierarchy(fleetId: string): Promise<FleetData> {
  try {
    // Adjust the endpoint based on actual Cerebus API documentation
    const data = await fetchFromCerebus(`/api/v1/fleets/${fleetId}/hierarchy`);
    
    // Recursive function to transform hierarchy
    function transformFleet(fleetData: any): FleetData {
      return {
        fleetId: fleetData.fleet_id || fleetData.fleetId,
        fleetName: fleetData.fleet_name || fleetData.fleetName,
        parentFleetId: fleetData.parent_fleet_id || fleetData.parentFleetId,
        subFleets: (fleetData.sub_fleets || fleetData.subFleets || [])
          .map(transformFleet),
      };
    }
    
    return transformFleet(data);
  } catch (error) {
    console.error(`Failed to fetch fleet hierarchy for ${fleetId}:`, error);
    throw new Error(`Unable to retrieve fleet hierarchy for ${fleetId}`);
  }
}
```

### Step 4: Handle API-Specific Variations

Different APIs may return data in different formats. Common variations to handle:

#### Field Naming Conventions

The Cerebus API might use:
- **snake_case**: `fleet_id`, `total_budget`
- **camelCase**: `fleetId`, `totalBudget`
- **PascalCase**: `FleetId`, `TotalBudget`

Use the transformation logic in the examples above to normalize field names.

#### Date Formats

The API might return dates in various formats:
- ISO 8601: `2025-01-15T00:00:00Z`
- Date only: `2025-01-15`
- Unix timestamp: `1736899200`

Normalize to ISO date string format:
```typescript
function normalizeDate(dateValue: any): string {
  if (typeof dateValue === 'number') {
    return new Date(dateValue * 1000).toISOString().split('T')[0];
  }
  return new Date(dateValue).toISOString().split('T')[0];
}
```

#### Currency Formats

The API might return amounts as:
- Numbers: `1000000`
- Strings: `"1000000.00"`
- With currency symbols: `"$1,000,000.00"`

Always convert to number:
```typescript
function parseAmount(value: any): number {
  if (typeof value === 'number') return value;
  // Remove currency symbols and commas
  const cleaned = String(value).replace(/[$,]/g, '');
  return parseFloat(cleaned) || 0;
}
```

### Step 5: Add Error Handling

Implement robust error handling:

```typescript
export class CerebusAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'CerebusAPIError';
  }
}

async function fetchFromCerebus(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${CEREBUS_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${CEREBUS_API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new CerebusAPIError(
        errorData.message || `API request failed: ${response.statusText}`,
        response.status,
        errorData
      );
    }
    
    return response.json();
  } catch (error) {
    if (error instanceof CerebusAPIError) {
      throw error;
    }
    throw new CerebusAPIError(
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
```

### Step 6: Testing the Integration

#### Unit Testing

Create test files to verify API integration:

```typescript
// __tests__/cerebus-api.test.ts
import { getBudgetData, getSpendData, getFleetHierarchy } from '@/lib/services/cerebus-api';

describe('Cerebus API Integration', () => {
  it('should fetch budget data for a valid fleet', async () => {
    const fleetId = 'YOUR_TEST_FLEET_ID';
    const budget = await getBudgetData(fleetId);
    
    expect(budget).toHaveProperty('fleetId');
    expect(budget).toHaveProperty('totalBudget');
    expect(typeof budget.totalBudget).toBe('number');
  });
  
  it('should fetch spend data within date range', async () => {
    const fleetId = 'YOUR_TEST_FLEET_ID';
    const startDate = new Date('2025-02-01');
    const endDate = new Date('2025-03-01');
    
    const spend = await getSpendData(fleetId, startDate, endDate);
    
    expect(Array.isArray(spend)).toBe(true);
    if (spend.length > 0) {
      expect(spend[0]).toHaveProperty('date');
      expect(spend[0]).toHaveProperty('amount');
    }
  });
  
  it('should handle invalid fleet IDs gracefully', async () => {
    const invalidFleetId = 'INVALID_ID_12345';
    
    await expect(getBudgetData(invalidFleetId)).rejects.toThrow();
  });
});
```

#### Manual Testing Checklist

- [ ] Test with a valid fleet ID
- [ ] Test with an invalid fleet ID
- [ ] Test with a fleet that has no budget data
- [ ] Test with a fleet that has no spend data
- [ ] Test date range handling (current fiscal year)
- [ ] Test fleet hierarchy with multiple levels
- [ ] Test error messages are user-friendly
- [ ] Test API timeout handling
- [ ] Test authentication failure scenarios
- [ ] Verify all calculations match expected results

### Step 7: Update the Dashboard

The dashboard (`app/page.tsx`) should already handle API errors, but you may want to add more specific error messages:

```typescript
'use client';

import { useState } from 'react';
import { getForecast } from '@/lib/services/forecast-calculator';
import { CerebusAPIError } from '@/lib/services/cerebus-api';

export default function Dashboard() {
  const [error, setError] = useState<string>('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const result = await getForecast(fleetId);
      setForecast(result);
    } catch (err) {
      if (err instanceof CerebusAPIError) {
        if (err.statusCode === 404) {
          setError('Fleet not found. Please check the fleet ID.');
        } else if (err.statusCode === 401) {
          setError('Authentication failed. Please check API credentials.');
        } else if (err.statusCode === 403) {
          setError('Access denied. You do not have permission to view this fleet.');
        } else {
          setError(`API Error: ${err.message}`);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      console.error('Forecast error:', err);
    }
  };
  
  // ... rest of component
}
```

### Step 8: Production Deployment

#### Environment Variables in Production

Add environment variables in your hosting platform:

**Vercel**:
1. Go to Project Settings → Environment Variables
2. Add `CEREBUS_API_URL`, `CEREBUS_API_KEY`, `CEREBUS_TIMEOUT`
3. Select production environment
4. Redeploy the application

**AWS/Other platforms**:
- Follow platform-specific instructions for setting environment variables
- Ensure variables are available at build time and runtime

#### Security Considerations

1. **Never commit `.env.local`** to version control
2. **Rotate API keys** periodically
3. **Use HTTPS** for all API communications
4. **Implement rate limiting** to prevent abuse
5. **Log API errors** but not sensitive data
6. **Use server-side API calls** when possible (API routes)

## Troubleshooting

### Common Issues

#### Issue: "Cerebus API request timed out"
**Solution**: 
- Increase `CEREBUS_TIMEOUT` in `.env.local`
- Check network connectivity to Cerebus API
- Verify API endpoint URLs are correct

#### Issue: "Authentication failed"
**Solution**:
- Verify `CEREBUS_API_KEY` is correct
- Check if API key has expired
- Ensure proper authorization header format

#### Issue: "Fleet not found"
**Solution**:
- Verify fleet ID exists in Cerebus
- Check if you have permissions to access that fleet
- Try with a known valid fleet ID

#### Issue: Data structure mismatch
**Solution**:
- Log the raw API response: `console.log('Raw response:', data)`
- Update transformation logic to match actual response format
- Refer to Cerebus API documentation for correct field names

### Debugging Tips

1. **Enable debug logging**:
   ```typescript
   const DEBUG = process.env.DEBUG_API_CALLS === 'true';
   
   if (DEBUG) {
     console.log('API Request:', endpoint, options);
     console.log('API Response:', data);
   }
   ```

2. **Test API directly** with curl:
   ```bash
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        "https://cerebus-api.example.com/api/v1/fleets/8304669/budget"
   ```

3. **Use browser DevTools** to inspect network requests
4. **Check Cerebus API status** page for outages
5. **Review API rate limits** and adjust request frequency

## API Documentation Reference

Consult the official Cerebus API documentation for:
- Complete endpoint list
- Request/response schemas
- Authentication methods
- Rate limiting policies
- Error codes and meanings

## Support

If you encounter issues during integration:
1. Check this guide first
2. Review Cerebus API documentation
3. Contact Cerebus API support
4. Open an issue in this project's repository

## Next Steps

After successful integration:
- [ ] Remove or disable mock data
- [ ] Update README with production setup
- [ ] Set up monitoring and alerting
- [ ] Configure logging for production
- [ ] Implement caching strategy (if needed)
- [ ] Add unit and integration tests
- [ ] Document any API-specific quirks or limitations
