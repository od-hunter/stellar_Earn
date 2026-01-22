// API utilities for user dashboard data

import type { DashboardData, UserStats, Quest, Submission, EarningsData, Badge } from '../types/dashboard';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Mock data for development - will be replaced with actual API calls
const mockUserStats: UserStats = {
  xp: 2450,
  level: 12,
  totalEarnings: 1250.50,
  questsCompleted: 28,
  currentStreak: 7,
};

const mockActiveQuests: Quest[] = [
  {
    id: '1',
    title: 'Complete GitHub Integration',
    description: 'Connect your GitHub account and make 3 commits',
    reward: 50,
    deadline: '2026-01-25',
    progress: 66,
    status: 'active',
    category: 'Development',
  },
  {
    id: '2',
    title: 'Smart Contract Review',
    description: 'Review and test the Soroban smart contract',
    reward: 100,
    deadline: '2026-01-28',
    progress: 30,
    status: 'active',
    category: 'Blockchain',
  },
  {
    id: '3',
    title: 'Documentation Update',
    description: 'Update the API documentation with new endpoints',
    reward: 30,
    deadline: '2026-01-23',
    progress: 90,
    status: 'active',
    category: 'Documentation',
  },
];

const mockRecentSubmissions: Submission[] = [
  {
    id: '1',
    questId: '10',
    questTitle: 'UI Component Library',
    submittedAt: '2026-01-20T14:30:00Z',
    status: 'approved',
    reward: 75,
  },
  {
    id: '2',
    questId: '11',
    questTitle: 'Bug Fix: Authentication Flow',
    submittedAt: '2026-01-19T09:15:00Z',
    status: 'pending',
    reward: 45,
  },
  {
    id: '3',
    questId: '12',
    questTitle: 'Database Migration Script',
    submittedAt: '2026-01-18T16:45:00Z',
    status: 'approved',
    reward: 60,
  },
  {
    id: '4',
    questId: '13',
    questTitle: 'API Rate Limiting',
    submittedAt: '2026-01-17T11:20:00Z',
    status: 'rejected',
    reward: 40,
    feedback: 'Missing test coverage for edge cases',
  },
];

const mockEarningsHistory: EarningsData[] = [
  { date: '2026-01-15', amount: 120 },
  { date: '2026-01-16', amount: 85 },
  { date: '2026-01-17', amount: 150 },
  { date: '2026-01-18', amount: 60 },
  { date: '2026-01-19', amount: 200 },
  { date: '2026-01-20', amount: 75 },
  { date: '2026-01-21', amount: 95 },
];

const mockBadges: Badge[] = [
  {
    id: '1',
    name: 'Early Adopter',
    description: 'Joined during the platform beta phase',
    icon: '🌟',
    earnedAt: '2026-01-01T00:00:00Z',
    rarity: 'rare',
  },
  {
    id: '2',
    name: 'Quest Master',
    description: 'Completed 25 quests',
    icon: '🏆',
    earnedAt: '2026-01-15T00:00:00Z',
    rarity: 'epic',
  },
  {
    id: '3',
    name: 'Code Warrior',
    description: 'Completed 10 development quests',
    icon: '⚔️',
    earnedAt: '2026-01-10T00:00:00Z',
    rarity: 'common',
  },
  {
    id: '4',
    name: 'Streak Legend',
    description: 'Maintained a 7-day streak',
    icon: '🔥',
    earnedAt: '2026-01-20T00:00:00Z',
    rarity: 'rare',
  },
  {
    id: '5',
    name: 'Stellar Pioneer',
    description: 'First transaction on Stellar network',
    icon: '🚀',
    earnedAt: '2026-01-05T00:00:00Z',
    rarity: 'legendary',
  },
];

// Simulated API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchUserStats(): Promise<UserStats> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/users/stats`);
  // return response.json();
  await delay(500);
  return mockUserStats;
}

export async function fetchActiveQuests(): Promise<Quest[]> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/quests/active`);
  // return response.json();
  await delay(600);
  return mockActiveQuests;
}

export async function fetchRecentSubmissions(): Promise<Submission[]> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/submissions/recent`);
  // return response.json();
  await delay(400);
  return mockRecentSubmissions;
}

export async function fetchEarningsHistory(): Promise<EarningsData[]> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/users/earnings`);
  // return response.json();
  await delay(700);
  return mockEarningsHistory;
}

export async function fetchBadges(): Promise<Badge[]> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/users/badges`);
  // return response.json();
  await delay(300);
  return mockBadges;
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const [stats, activeQuests, recentSubmissions, earningsHistory, badges] = await Promise.all([
    fetchUserStats(),
    fetchActiveQuests(),
    fetchRecentSubmissions(),
    fetchEarningsHistory(),
    fetchBadges(),
  ]);

  return {
    stats,
    activeQuests,
    recentSubmissions,
    earningsHistory,
    badges,
  };
}
