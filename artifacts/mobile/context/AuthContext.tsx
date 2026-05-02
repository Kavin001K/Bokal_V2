import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
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
  user: AuthUser | null;
}

interface AuthContextValue extends AuthState {
  isLoading: boolean;
  login: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, user: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const rawDomain = process.env["EXPO_PUBLIC_DOMAIN"] || "localhost:3000";
    const domain = rawDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const isLocal =
      domain.includes("localhost") ||
      domain.includes("127.0.0.1") ||
      domain.includes("192.168.") ||
      domain.includes("10.0.");
    setBaseUrl(`${isLocal ? "http" : "https"}://${domain}`);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as AuthState;
          if (stored.token && stored.user) {
            setState(stored);
            setAuthTokenGetter(() => stored.token);
          }
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (token: string, user: AuthUser) => {
    const newState = { token, user };
    setState(newState);
    setAuthTokenGetter(() => token);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(newState));
  }, []);

  const logout = useCallback(async () => {
    setState({ token: null, user: null });
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
