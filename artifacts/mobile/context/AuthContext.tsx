import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const AUTH_KEY = "bookal_auth";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  mustChangePw: boolean;
  phoneNumber?: string;
  dateOfBirth?: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
}

interface JwtPayload {
  exp?: number;
}

interface AuthContextValue extends AuthState {
  isLoading: boolean;
  login: (token: string, user: AuthUser, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    
    // Pure JS Base64 decoding (standard atob replacement)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = normalized.replace(/=+$/, '');
    let output = '';
    for (let bc = 0, bs = 0, buffer, i = 0; (buffer = str.charAt(i++)); ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4) ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)))) : 0) {
      buffer = chars.indexOf(buffer);
    }
    
    // Convert to UTF-8
    const json = decodeURIComponent(
      output.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return true;
  }
  return Date.now() >= payload.exp * 1000;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, refreshToken: null, user: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setBaseUrl(getApiBaseUrl());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as AuthState;
          if (stored.token && stored.user) {
            if (!isTokenExpired(stored.token)) {
              setState(stored);
              setAuthTokenGetter(() => stored.token);
            } else if (stored.refreshToken) {
              try {
                const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ refreshToken: stored.refreshToken }),
                });
                const data = await response.json();
                if (!response.ok || !data?.token || !data?.refreshToken || !data?.user) {
                  throw new Error("Refresh failed");
                }

                const refreshed: AuthState = {
                  token: data.token,
                  refreshToken: data.refreshToken,
                  user: data.user,
                };
                setState(refreshed);
                setAuthTokenGetter(() => data.token);
                await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(refreshed));
              } catch {
                await AsyncStorage.removeItem(AUTH_KEY);
                setAuthTokenGetter(null);
                setState({ token: null, refreshToken: null, user: null });
              }
            } else {
              await AsyncStorage.removeItem(AUTH_KEY);
              setAuthTokenGetter(null);
              setState({ token: null, refreshToken: null, user: null });
            }
          }
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (token: string, user: AuthUser, refreshToken?: string) => {
    const newState = { token, user, refreshToken: refreshToken ?? null };
    setState(newState);
    setAuthTokenGetter(() => token);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(newState));
  }, []);

  const logout = useCallback(async () => {
    setState({ token: null, refreshToken: null, user: null });
    setAuthTokenGetter(null);
    await AsyncStorage.removeItem(AUTH_KEY);
  }, []);

  const updateUser = useCallback((user: AuthUser) => {
    setState((prev) => {
      const next = { ...prev, user };
      AsyncStorage.setItem(AUTH_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, isLoading, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
