import { useCallback, useMemo, useState, type ReactNode } from "react";

import { AuthContext } from "@/contexts/auth-context";
import * as authService from "@/services/authService";

interface User {
  id: string;
  email: string;
}

function readStoredUser(): User | null {
  const savedUser = localStorage.getItem("verba_user");

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser) as User;
  } catch (error) {
    console.warn("Invalid stored user data. Clearing persisted auth state.", error);
    localStorage.removeItem("verba_user");
    return null;
  }
}

function persistAuth(user: User, token: string): void {
  localStorage.setItem("verba_user", JSON.stringify(user));
  localStorage.setItem("verba_token", token);
}

function clearPersistedAuth(): void {
  localStorage.removeItem("verba_user");
  localStorage.removeItem("verba_token");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("verba_token"),
  );
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);

    try {
      const authResponse = await authService.login(email, password);
      if (!authResponse.success || !authResponse.data) {
        return {
          success: false,
          error: authResponse.error || "Login failed",
        };
      }

      const { access_token } = authResponse.data;
      const userResponse = await authService.getCurrentUser(access_token);
      if (!userResponse.success || !userResponse.data) {
        return {
          success: false,
          error: userResponse.error || "Failed to get user information",
        };
      }

      const userData = userResponse.data;
      setUser(userData);
      setToken(access_token);
      persistAuth(userData, access_token);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);

      try {
        const registerResponse = await authService.register({ email, password });
        if (!registerResponse.success) {
          return {
            success: false,
            error: registerResponse.error || "Registration failed",
          };
        }

        return await login(email, password);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
      } finally {
        setIsLoading(false);
      }
    },
    [login],
  );

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    clearPersistedAuth();
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading,
      login,
      signup,
      logout,
    }),
    [isLoading, login, logout, signup, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
