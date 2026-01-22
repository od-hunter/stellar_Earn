'use client';

import type { UserStats } from '@/lib/types/dashboard';

interface StatsCardsProps {
  stats: UserStats | null;
  isLoading: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
}

function StatCard({ title, value, icon, subtitle, trend, isLoading }: StatCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
        <div className="mt-4">
          <div className="h-8 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="mt-1 h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-xl dark:bg-zinc-800">
          {icon}
        </div>
        {trend && (
          <span
            className={`text-sm font-medium ${
              trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{value}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{title}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function calculateLevel(xp: number): { level: number; progress: number; xpToNext: number } {
  // XP required for each level increases
  const xpPerLevel = 250;
  const level = Math.floor(xp / xpPerLevel) + 1;
  const currentLevelXp = xp % xpPerLevel;
  const progress = (currentLevelXp / xpPerLevel) * 100;
  const xpToNext = xpPerLevel - currentLevelXp;
  return { level, progress, xpToNext };
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const levelInfo = stats ? calculateLevel(stats.xp) : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total XP"
        value={stats?.xp.toLocaleString() ?? 0}
        icon={<span>⚡</span>}
        subtitle={levelInfo ? `${levelInfo.xpToNext} XP to next level` : undefined}
        isLoading={isLoading}
      />
      <StatCard
        title="Current Level"
        value={stats?.level ?? 0}
        icon={<span>🎯</span>}
        subtitle={`${stats?.questsCompleted ?? 0} quests completed`}
        isLoading={isLoading}
      />
      <StatCard
        title="Total Earnings"
        value={stats ? `$${stats.totalEarnings.toLocaleString()}` : '$0'}
        icon={<span>💰</span>}
        trend={{ value: 12, isPositive: true }}
        isLoading={isLoading}
      />
      <StatCard
        title="Current Streak"
        value={`${stats?.currentStreak ?? 0} days`}
        icon={<span>🔥</span>}
        subtitle="Keep it going!"
        isLoading={isLoading}
      />
    </div>
  );
}
