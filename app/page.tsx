'use client';

import { useState } from 'react';
import { ForecastDisplay } from '@/components/dashboard/ForecastDisplay';
import { getFleetForecast } from '@/lib/services/cerebus-api';
import type { ForecastResult } from '@/lib/types';

export default function Home() {
  const [fleetId, setFleetId] = useState('8304669');
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchForecast = async () => {
    if (!fleetId.trim()) {
      setError('Please enter a fleet ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getFleetForecast(fleetId);
      setForecast(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch forecast');
      setForecast(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFetchForecast();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            IMR Budget Forecaster
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Analyze and forecast infrastructure spending
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Fleet Input Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <label htmlFor="fleetId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Fleet ID
          </label>
          <div className="flex gap-4">
            <input
              id="fleetId"
              type="text"
              value={fleetId}
              onChange={(e) => setFleetId(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter fleet ID (e.g., 8304669)"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              disabled={loading}
            />
            <button
              onClick={handleFetchForecast}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                'Get Forecast'
              )}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            <p>💡 Sample Fleet ID: 8304669</p>
            <p className="mt-1">Note: Currently using mock data. Replace with actual Cerebus API integration for production.</p>
          </div>
        </div>

        {/* Forecast Display */}
        {forecast && <ForecastDisplay forecast={forecast} />}

        {/* Empty State */}
        {!forecast && !loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No forecast data</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Enter a fleet ID above to generate a budget forecast
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            IMR Budget Forecaster - Infrastructure Market Rate Budget Analysis Tool
          </p>
        </div>
      </footer>
    </div>
  );
}
