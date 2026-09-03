import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type AuthUser } from "../lib/api";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithPassword: (
    usr: string,
    pwd: string,
    erpUrl?: string,
    rememberMe?: boolean,
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithApiKey: (
    apiKey: string,
    apiSecret: string,
    erpUrl?: string,
    rememberMe?: boolean,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  savedUsername: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USER = "mmmc_erp_auth_user";
const STORAGE_KEY_SAVED_USERNAME = "mmmc_erp_saved_username";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savedUsername, setSavedUsername] = useState<string>("");

  // Restore session from localStorage on initial render
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem(STORAGE_KEY_USER);
      const savedUsr = localStorage.getItem(STORAGE_KEY_SAVED_USERNAME) || "";
      setSavedUsername(savedUsr);

      if (savedUserStr) {
        const parsedUser = JSON.parse(savedUserStr) as AuthUser;
        if (parsedUser && parsedUser.username) {
          setUser(parsedUser);

          // Silently verify session in background if sid is present
          if (parsedUser.sid) {
            api
              .verifySession(parsedUser.sid, parsedUser.erpUrl)
              .then((res) => {
                if (!res.valid) {
                  // Session expired on server
                  console.warn("ERPNext session expired, logging out");
                  localStorage.removeItem(STORAGE_KEY_USER);
                  setUser(null);
                } else if (res.user && typeof res.user === "object") {
                  // Session verified: update user with fresh roles and permissions!
                  setUser((prev) => {
                    const updated = {
                      ...(prev || parsedUser),
                      ...(res.user as AuthUser),
                    };
                    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
                    return updated;
                  });
                }
              })
              .catch(() => {
                // Keep local state on network error
              });
          }
        }
      }
    } catch (e) {
      console.error("Failed to restore auth session:", e);
      localStorage.removeItem(STORAGE_KEY_USER);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithPassword = async (
    usr: string,
    pwd: string,
    erpUrl?: string,
    rememberMe: boolean = true,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const res = await api.login(usr, pwd, erpUrl);

      if (res.success && res.user) {
        setUser(res.user);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(res.user));

        if (rememberMe) {
          localStorage.setItem(STORAGE_KEY_SAVED_USERNAME, usr.trim());
          setSavedUsername(usr.trim());
        } else {
          localStorage.removeItem(STORAGE_KEY_SAVED_USERNAME);
          setSavedUsername("");
        }

        return { success: true };
      }

      return {
        success: false,
        error: res.error || "لاگ اِن کی توثیق نہیں ہو سکی۔ (Authentication failed)",
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errMsg };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithApiKey = async (
    apiKey: string,
    apiSecret: string,
    erpUrl?: string,
    rememberMe: boolean = true,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const res = await api.loginWithApiKey(apiKey, apiSecret, erpUrl);

      if (res.success && res.user) {
        setUser(res.user);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(res.user));

        if (rememberMe) {
          localStorage.setItem(STORAGE_KEY_SAVED_USERNAME, apiKey.trim());
          setSavedUsername(apiKey.trim());
        }

        return { success: true };
      }

      return {
        success: false,
        error: res.error || "API کیز کی توثیق نہیں ہو سکی۔",
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errMsg };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (user?.sid) {
        await api.logout(user.sid, user.erpUrl).catch(() => {});
      }
    } finally {
      setUser(null);
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        loginWithPassword,
        loginWithApiKey,
        logout,
        savedUsername,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
