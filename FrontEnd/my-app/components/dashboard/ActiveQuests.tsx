'use client';

import type { Quest } from '@/lib/types/dashboard';

interface ActiveQuestsProps {
  quests: Quest[];
  isLoading: boolean;
}

interface QuestCardProps {
  quest: Quest;
}

function QuestCardSkeleton() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-5 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="mt-2 h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
        <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
      </div>
      <div className="mt-4">
        <div className="h-2 w-full animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
    </div>
  );
}

function QuestCard({ quest }: QuestCardProps) {
  const daysUntilDeadline = Math.ceil(
    (new Date(quest.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isUrgent = daysUntilDeadline <= 2;

  const categoryColors: Record<string, string> = {
    Development: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Blockchain: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Documentation: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Design: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    Testing: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">
            {quest.title}
          </h4>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
            {quest.description}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            categoryColors[quest.category] || 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          {quest.category}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
          <span>Progress</span>
          <span>{quest.progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${quest.progress}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-medium text-green-600 dark:text-green-400">
          +{quest.reward} XLM
        </span>
        <span
          className={`flex items-center gap-1 ${
            isUrgent
              ? 'text-red-600 dark:text-red-400'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          {isUrgent && <span>⚠️</span>}
          {daysUntilDeadline > 0 ? `${daysUntilDeadline} days left` : 'Due today'}
        </span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
      <div className="text-4xl mb-3">🎯</div>
      <h4 className="font-medium text-zinc-900 dark:text-zinc-50">No active quests</h4>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Browse available quests to start earning rewards
      </p>
      <button className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
        Explore Quests
      </button>
    </div>
  );
}

export function ActiveQuests({ quests, isLoading }: ActiveQuestsProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Active Quests
        </h3>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {isLoading ? '...' : quests.length}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <QuestCardSkeleton />
          <QuestCardSkeleton />
          <QuestCardSkeleton />
        </div>
      ) : quests.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {quests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </div>
      )}

      {!isLoading && quests.length > 0 && (
        <button className="mt-4 w-full rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
          View All Quests
        </button>
      )}
    </div>
  );
}
