import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError, setSignedOutHandler } from "./api";
import { clearToken, readToken, saveToken } from "./session";
import { registerForPush, unregisterPush } from "./push";
import { storage } from "./storage";
import type { SessionUser } from "./types";

interface AuthState {
  /** undefined while the stored session is being checked. */
  user: SessionUser | null | undefined;
  ageConfirmed: boolean | undefined;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  confirmAge: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** The signed-in account from the stored session, or null (no session, expired, or e-mail not verified yet). */
async function loadUser(): Promise<SessionUser | null> {
  if (!(await readToken())) return null;
  try {
    const me = await api<{ user: (SessionUser & { emailVerified: boolean }) | null }>("/api/auth/me");
    return me.user && me.user.emailVerified ? me.user : null;
  } catch {
    return null;
  }
}
const AGE_KEY = "orochia.ageConfirmed";

/**
 * Who is using the app. A native sign-in (`client: "native"`) answers the signed session token, kept in secure storage;
 * the account is then read from /api/auth/me. An account whose e-mail is not verified is treated as signed out, like
 * on the web. The 18+ confirmation is asked once per install.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [ageConfirmed, setAgeConfirmed] = useState<boolean | undefined>(undefined);

  const refresh = useCallback(async () => setUser(await loadUser()), []);

  useEffect(() => {
    let live = true;
    setSignedOutHandler(() => setUser(null));
    void loadUser().then((u) => {
      if (!live) return;
      setUser(u);
      if (u) void registerForPush();
    });
    void storage.get(AGE_KEY).then((v) => live && setAgeConfirmed(v === "yes"));
    return () => {
      live = false;
      setSignedOutHandler(null);
    };
  }, []);

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      const res = await api<{ token?: string; emailVerified: boolean }>("/api/auth/login", { method: "POST", body: { identifier, password, client: "native" } });
      if (!res.token) throw new ApiError(500, { error: "No session token" });
      if (!res.emailVerified) throw new ApiError(403, { code: "EMAIL_NOT_VERIFIED" });
      await saveToken(res.token);
      await refresh();
      void registerForPush();
    },
    [refresh],
  );

  const signOut = useCallback(async () => {
    await unregisterPush();
    await clearToken();
    setUser(null);
  }, []);

  const confirmAge = useCallback(async () => {
    await storage.set(AGE_KEY, "yes");
    setAgeConfirmed(true);
  }, []);

  const value = useMemo(() => ({ user, ageConfirmed, signIn, signOut, confirmAge, refresh }), [user, ageConfirmed, signIn, signOut, confirmAge, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
