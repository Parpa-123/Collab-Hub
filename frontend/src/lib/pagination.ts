import type { AxiosInstance, AxiosRequestConfig } from "axios";

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function hasResultsArray<T>(payload: unknown): payload is { results: T[] } {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }
  return Array.isArray((payload as { results?: unknown }).results);
}

function isPaginatedResponse<T>(payload: unknown): payload is PaginatedResponse<T> {
  if (!hasResultsArray<T>(payload)) {
    return false;
  }

  const value = payload as {
    count?: unknown;
    next?: unknown;
    previous?: unknown;
  };

  const hasCount = typeof value.count === "number";
  const hasNext = typeof value.next === "string" || value.next === null;
  const hasPrevious = typeof value.previous === "string" || value.previous === null;

  return hasCount && hasNext && hasPrevious;
}

export async function fetchAllPages<T>(
  client: AxiosInstance,
  url: string,
  config?: Omit<AxiosRequestConfig, "method" | "url">
): Promise<T[]> {
  const results: T[] = [];
  const seenUrls = new Set<string>();

  let nextUrl: string | null = url;
  let nextConfig: Omit<AxiosRequestConfig, "method" | "url"> | undefined = config;

  while (nextUrl) {
    if (seenUrls.has(nextUrl)) {
      break;
    }
    seenUrls.add(nextUrl);

    const response = await client.get<PaginatedResponse<T>>(nextUrl, nextConfig);
    const payload: unknown = response.data;

    if (Array.isArray(payload)) {
      results.push(...payload);
      break;
    }

    if (isPaginatedResponse<T>(payload)) {
      results.push(...payload.results);
      nextUrl = payload.next;
      nextConfig = undefined;
      continue;
    }

    if (hasResultsArray<T>(payload)) {
      results.push(...payload.results);
    }
    break;
  }

  return results;
}
