import type { Quest, QuestFilters, PaginationParams, PaginatedResponse } from '@/lib/types/quest';

/**
 * Get quests with optional filters and pagination
 */
export async function getQuests(
  filters?: QuestFilters,
  pagination?: PaginationParams,
): Promise<PaginatedResponse<Quest>> {
  // TODO: Replace with actual API call
  // const params = new URLSearchParams();
  // if (filters?.status) params.append('status', filters.status);
  // if (filters?.difficulty) params.append('difficulty', filters.difficulty);
  // if (filters?.category) params.append('category', filters.category);
  // if (filters?.search) params.append('search', filters.search);
  // if (pagination?.page) params.append('page', pagination.page.toString());
  // if (pagination?.limit) params.append('limit', pagination.limit.toString());
  //
  // const response = await fetch(`/api/quests?${params.toString()}`);
  // if (!response.ok) throw new Error('Failed to fetch quests');
  // return response.json();

  // For now, return empty - will be populated by mock data
  return {
    data: [],
    pagination: {
      page: pagination?.page || 1,
      limit: pagination?.limit || 12,
      total: 0,
      totalPages: 0,
      hasMore: false,
    },
  };
}

/**
 * Get a single quest by ID
 */
export async function getQuestById(id: string): Promise<Quest> {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/quests/${id}`);
  // if (!response.ok) throw new Error('Failed to fetch quest');
  // return response.json();

  // For now, use mock data
  const { getMockQuests } = await import('@/lib/mock/quests');
  const quests = getMockQuests();
  const quest = quests.find((q) => q.id === id);
  
  if (!quest) {
    throw new Error('Quest not found');
  }

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  return quest;
}
