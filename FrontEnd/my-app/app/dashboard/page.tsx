'use client';

import { useUserStats } from '@/lib/hooks/useUserStats';
import {
  StatsCards,
  ActiveQuests,
  RecentSubmissions,
  EarningsChart,
  BadgeDisplay,
} from '@/components/dashboard';

export default function DashboardPage() {
  const {
    stats,
    activeQuests,
    recentSubmissions,
    earningsHistory,
    badges,
    isLoading,
    error,
    refetch,
  } = useUserStats();

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-900/20">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
              Failed to load dashboard
            </h2>
            <p className="mt-1 text-sm text-red-600 dark:text-red-300">{error}</p>
            <button
              onClick={refetch}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Track your progress, earnings, and quest history
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={refetch}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Browse Quests
              </button>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <section className="mb-8">
          <StatsCards stats={stats} isLoading={isLoading} />
        </section>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Active Quests */}
          <div className="lg:col-span-1">
            <ActiveQuests quests={activeQuests} isLoading={isLoading} />
          </div>

          {/* Right Column - Charts and Submissions */}
          <div className="space-y-6 lg:col-span-2">
            {/* Earnings Chart */}
            <EarningsChart earnings={earningsHistory} isLoading={isLoading} />

            {/* Recent Submissions */}
            <RecentSubmissions submissions={recentSubmissions} isLoading={isLoading} />
          </div>
        </div>

        {/* Badges Section */}
        <section className="mt-6">
          <BadgeDisplay badges={badges} isLoading={isLoading} />
        </section>

        {/* Quick Actions Footer */}
        <footer className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Quick Actions
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-xl dark:bg-blue-900/30">
                🎯
              </span>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">Find Quest</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Browse available</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-xl dark:bg-green-900/30">
                📤
              </span>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">Submit Work</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Upload proof</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-xl dark:bg-purple-900/30">
                💎
              </span>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">Claim Rewards</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Withdraw XLM</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-xl dark:bg-amber-900/30">
                👤
              </span>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">Edit Profile</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Update info</p>
              </div>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
