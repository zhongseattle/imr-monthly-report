'use client';

import type { ForecastResult } from '@/lib/types';
import { StatCard } from '@/components/ui/StatCard';
import { BurnRateChart } from './BurnRateChart';
import { formatCurrency, formatPercentage, formatDisplayDate } from '@/lib/utils/date-utils';

interface ForecastDisplayProps {
  forecast: ForecastResult;
}

export function ForecastDisplay({ forecast }: ForecastDisplayProps) {
  return (
    <div className="space-y-6">
      {/* Fleet Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">{forecast.fleetName}</h1>
        <p className="text-blue-100">Fleet ID: {forecast.fleetId}</p>
        <p className="text-blue-100 mt-1">
          Fiscal Year {forecast.fiscalYearStart.getFullYear()}: {formatDisplayDate(forecast.fiscalYearStart)} - {formatDisplayDate(forecast.fiscalYearEnd)}
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Annual Budget"
          value={formatCurrency(forecast.budget)}
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        
        <StatCard
          title="YTD Spend"
          value={formatCurrency(forecast.ytdSpend)}
          subtitle={`${forecast.daysElapsed} days elapsed`}
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        
        <StatCard
          title="Daily Burn Rate"
          value={formatCurrency(forecast.avgDailyBurnRate)}
          subtitle={`Avg. across ${forecast.daysElapsed} days`}
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        
        <StatCard
          title="Forecasted EOY Spend"
          value={formatCurrency(forecast.forecastedEOYSpend)}
          subtitle={forecast.isOverBudget ? 'Over Budget' : 'Under Budget'}
          trend={forecast.isOverBudget ? 'negative' : 'positive'}
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
      </div>

      {/* Budget Variance */}
      <div className={`rounded-lg shadow-md p-6 border-2 ${
        forecast.isOverBudget
          ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
          : 'bg-green-50 dark:bg-green-900/20 border-green-500'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Budget Variance
            </h3>
            <p className={`text-3xl font-bold ${
              forecast.isOverBudget
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }`}>
              {forecast.variance >= 0 ? '+' : ''}{formatCurrency(forecast.variance)}
            </p>
            <p className={`text-lg mt-1 ${
              forecast.isOverBudget
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }`}>
              {forecast.variancePercentage >= 0 ? '+' : ''}{formatPercentage(forecast.variancePercentage)}
            </p>
          </div>
          <div className={`text-5xl ${
            forecast.isOverBudget
              ? 'text-red-500'
              : 'text-green-500'
          }`}>
            {forecast.isOverBudget ? '⚠️' : '✅'}
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          {forecast.isOverBudget
            ? `At the current burn rate, the fleet is projected to exceed its budget by ${formatCurrency(Math.abs(forecast.variance))}.`
            : `At the current burn rate, the fleet is projected to be under budget by ${formatCurrency(Math.abs(forecast.variance))}.`
          }
        </p>
      </div>

      {/* Monthly Burn Rate Chart */}
      <BurnRateChart data={forecast.monthlyBurnRates} />

      {/* Monthly Breakdown Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Monthly Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Month</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Total Spend</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Days</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Daily Burn Rate</th>
              </tr>
            </thead>
            <tbody>
              {forecast.monthlyBurnRates.map((month) => (
                <tr key={month.month} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-3 px-4 text-gray-900 dark:text-white">{month.monthName}</td>
                  <td className="py-3 px-4 text-right text-gray-900 dark:text-white">{formatCurrency(month.totalSpend)}</td>
                  <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{month.daysInMonth}</td>
                  <td className="py-3 px-4 text-right text-gray-900 dark:text-white font-medium">{formatCurrency(month.dailyBurnRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sub-Fleets */}
      {forecast.subFleets && forecast.subFleets.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sub-Fleets Summary
          </h3>
          <div className="space-y-4">
            {forecast.subFleets.map((subFleet) => (
              <div key={subFleet.fleetId} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{subFleet.fleetName}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{subFleet.fleetId}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    subFleet.isOverBudget
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {subFleet.isOverBudget ? 'Over Budget' : 'Under Budget'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Budget</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(subFleet.budget)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">YTD Spend</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(subFleet.ytdSpend)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Forecasted EOY</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(subFleet.forecastedEOYSpend)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Variance</p>
                    <p className={`font-semibold ${
                      subFleet.isOverBudget
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {subFleet.variance >= 0 ? '+' : ''}{formatCurrency(subFleet.variance)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
