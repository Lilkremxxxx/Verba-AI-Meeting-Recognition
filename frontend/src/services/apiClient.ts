const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

type JsonBody = BodyInit | null | undefined;

interface RequestOptions extends Omit<RequestInit, "headers" | "body"> {
  body?: JsonBody;
  headers?: HeadersInit;
  requireAuth?: boolean;
}

function getStoredToken(): string {
  const token = localStorage.getItem("verba_token");

  if (!token) {
    throw new Error("No authentication token found. Please login.");
  }

  return token;
}

export function getAuthHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${getStoredToken()}`,
  };
}

async function parseError(response: Response): Promise<never> {
  const errorData = await response.json().catch(() => ({}));
  const message =
    errorData.detail ||
    errorData.message ||
    errorData.error ||
    `HTTP error! status: ${response.status}`;

  throw new Error(message);
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { headers, requireAuth = false, ...rest } = options;
  const mergedHeaders = new Headers(headers);

  if (requireAuth) {
    const authHeaders = getAuthHeaders();

    Object.entries(authHeaders).forEach(([key, value]) => {
      if (value) {
        mergedHeaders.set(key, value);
      }
    });
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: mergedHeaders,
  });

  if (!response.ok) {
    return parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export { API_BASE_URL };
