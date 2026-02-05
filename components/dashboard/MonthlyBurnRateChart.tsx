'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { MonthlyBurnRate } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/date-utils';

interface MonthlyBurnRateChartProps {
  data: MonthlyBurnRate[];
}

export function MonthlyBurnRateChart({ data }: MonthlyBurnRateChartProps) {
  // Fiscal year months: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec
  const fiscalMonths = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Create a map of existing data
  const dataMap = new Map(
    data.map(item => [item.monthName.split(' ')[0], item.dailyBurnRate])
  );

  // Build chart data with all 12 months, filling in zeros for months without data
  const chartData = fiscalMonths.map((month) => ({
    month: month.substring(0, 3), // Abbreviated month names (Feb, Mar, etc.)
    'Daily Burn Rate': dataMap.get(month) || 0,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Monthly Burn Rate (Fiscal Year)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
          <XAxis
            dataKey="month"
            className="text-gray-600 dark:text-gray-400"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            className="text-gray-600 dark:text-gray-400"
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip
            formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : '$0.00'}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
          />
          <Legend />
          <Bar dataKey="Daily Burn Rate" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
        Average daily spend per month (Fiscal Year: January - December)
      </p>
    </div>
  );
}
