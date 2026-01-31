/**
 * Authentication service for API interactions
 */

export interface User {
  id: string; // UUID from backend
  email: string;
  created_at?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface LoginPayload {
  username: string; // OAuth2PasswordRequestForm uses 'username' field
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

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Register a new user
 * @param payload - Object containing email and password
 * @returns Promise with success status or error
 */
export async function register(
  payload: RegisterPayload
): Promise<UserResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `HTTP error! status: ${response.status}`
      );
    }

    const data: User = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error during registration:", error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to register user",
    };
  }
}

/**
 * Login user and get access token
 * @param email - User email
 * @param password - User password
 * @returns Promise with access token or error
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    // Backend expects OAuth2PasswordRequestForm format (x-www-form-urlencoded)
    const formData = new URLSearchParams();
    formData.append("username", email); // OAuth2 uses 'username' field
    formData.append("password", password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        access_token: data.access_token,
        token_type: data.token_type,
      },
    };
  } catch (error) {
    console.error("Error during login:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to login",
    };
  }
}

/**
 * Get current user information using access token
 * @param token - JWT access token
 * @returns Promise with user data or error
 */
export async function getCurrentUser(token: string): Promise<UserResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `HTTP error! status: ${response.status}`
      );
    }

    const data: User = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error fetching current user:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch user information",
    };
  }
}

/**
 * Verify if token is valid by fetching current user
 * @param token - JWT access token
 * @returns Promise with boolean indicating if token is valid
 */
export async function verifyToken(token: string): Promise<boolean> {
  const result = await getCurrentUser(token);
  return result.success;
}
