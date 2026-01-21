export enum SubmissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
  UNDER_REVIEW = 'UNDER_REVIEW',
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  rewardAmount: number;
  rewardAsset: string;
  deadline?: string;
  status?: string;
}

export interface Submission {
  id: string;
  questId: string;
  userId: string;
  status: SubmissionStatus;
  proof: Record<string, unknown>;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  quest: Quest;
}

export interface SubmissionFilters {
  status?: SubmissionStatus;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasMore?: boolean;
    cursor?: string;
    nextCursor?: string;
  };
}
