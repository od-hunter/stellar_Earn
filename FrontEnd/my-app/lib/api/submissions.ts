import type {
  Submission,
  SubmissionFilters,
  PaginationParams,
  PaginatedResponse,
} from '../types/submission';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

/**
 * Get authentication token from localStorage or session
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

/**
 * Build query string from filters and pagination params
 */
function buildQueryString(
  filters?: SubmissionFilters,
  pagination?: PaginationParams,
): string {
  const params = new URLSearchParams();

  if (filters?.status) {
    params.append('status', filters.status);
  }

  if (pagination?.page) {
    params.append('page', pagination.page.toString());
  }

  if (pagination?.limit) {
    params.append('limit', pagination.limit.toString());
  }

  if (pagination?.cursor) {
    params.append('cursor', pagination.cursor);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Fetch user submissions from the backend API
 */
export async function fetchSubmissions(
  filters?: SubmissionFilters,
  pagination?: PaginationParams,
): Promise<PaginatedResponse<Submission>> {
  const token = getAuthToken();
  const queryString = buildQueryString(filters, pagination);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/submissions${queryString}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to fetch submissions: ${response.statusText}`,
    );
  }

  const data = await response.json();

  // Handle different response formats
  if (Array.isArray(data)) {
    // If API returns array directly, wrap it
    return {
      data,
      pagination: {
        page: pagination?.page || 1,
        limit: pagination?.limit || data.length,
        total: data.length,
        hasMore: false,
      },
    };
  }

  // If API returns paginated response
  if (data.data && Array.isArray(data.data)) {
    return data as PaginatedResponse<Submission>;
  }

  // Fallback: wrap single object in array
  return {
    data: [data],
    pagination: {
      page: 1,
      limit: 1,
      total: 1,
      hasMore: false,
    },
  };
}
