/**
 * Authentication service for API interactions
 */

import { apiRequest } from "@/services/apiClient";

export interface User {
  id: string;
  email: string;
  created_at?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    access_token: string;
    token_type: string;
  };
  error?: string;
}

export interface UserResponse {
  success: boolean;
  data?: User;
  error?: string;
}

async function safeAuthRequest<T>(
  action: string,
  request: () => Promise<T>,
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await request();
    return { success: true, data };
  } catch (error) {
    console.error(`Error ${action}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to ${action}`,
    };
  }
}

/**
 * Register a new user
 */
export async function register(payload: RegisterPayload): Promise<UserResponse> {
  return safeAuthRequest("during registration", () =>
    apiRequest<User>("/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }),
  );
}

/**
 * Login user and get access token
 */
export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return safeAuthRequest("during login", async () => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const data = await apiRequest<{ access_token: string; token_type: string }>(
      "/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      },
    );

    return {
      access_token: data.access_token,
      token_type: data.token_type,
    };
  });
}

/**
 * Get current user information using access token
 */
export async function getCurrentUser(token: string): Promise<UserResponse> {
  return safeAuthRequest("fetching current user", () =>
    apiRequest<User>("/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
}

/**
 * Verify if token is valid by fetching current user
 */
export async function verifyToken(token: string): Promise<boolean> {
  const result = await getCurrentUser(token);
  return result.success;
}
