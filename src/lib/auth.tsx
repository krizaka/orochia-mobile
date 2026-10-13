import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError, setSignedOutHandler } from "./api";
import { clearNativeCookies } from "./cookie-jar";
import { clearToken, readToken, saveToken } from "./session";
import { registerForPush, unregisterPush } from "./push";
import { register, type SignUpForm, type SignUpInput } from "./signup";
import { storage } from "./storage";
import type { SessionUser } from "./types";

interface AuthState {
  /** undefined while the stored session is being checked. */
  user: SessionUser | null | undefined;
  /**
   * Signed in, e-mail not verified yet (after a sign-up, or a sign-in before the link was opened): the account can do
   * nothing but wait for the link and ask for it again — the app shows the verification step.
   */
  pending: SessionUser | null;
  /** Only in a demo deployment: the verification link the server answered, so a test build can finish the flow. */
  devVerificationUrl: string | null;
  ageConfirmed: boolean | undefined;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput, form: SignUpForm, challengeToken: string | null) => Promise<void>;
  /** Asks the server again whether the address is verified; true when it is (the account is then signed in). */
  checkVerified: () => Promise<boolean>;
  /** E-mails a new verification link (the previous one stops working). */
  resendVerification: () => Promise<void>;
  signOut: () => Promise<void>;
  confirmAge: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

type MeUser = SessionUser & { emailVerified: boolean };

/**
 * The account of the stored session: verified (`user`), not verified yet (`pending`), or neither (no session, expired).
 * When the address was verified since the token was issued, the server answers a refreshed token: it replaces the old.
 */
async function loadAccount(): Promise<{ user: SessionUser | null; pending: SessionUser | null }> {
  if (!(await readToken())) return { user: null, pending: null };
  try {
    const me = await api<{ user: MeUser | null; token?: string }>("/api/auth/me");
    if (me.token) await saveToken(me.token);
    if (!me.user) return { user: null, pending: null };
    return me.user.emailVerified ? { user: me.user, pending: null } : { user: null, pending: me.user };
  } catch {
    return { user: null, pending: null };
  }
}
const AGE_KEY = "orochia.ageConfirmed";

/**
 * Who is using the app. A native sign-in or sign-up (`client: "native"`) answers the signed session token, kept in
 * secure storage; the account is then read from /api/auth/me. An account whose e-mail is not verified is `pending`: it
 * sees the verification step and nothing else, like on the web. The 18+ confirmation is asked once per install.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [pending, setPending] = useState<SessionUser | null>(null);
  const [devVerificationUrl, setDevVerificationUrl] = useState<string | null>(null);
  const [ageConfirmed, setAgeConfirmed] = useState<boolean | undefined>(undefined);

  const apply = useCallback((account: { user: SessionUser | null; pending: SessionUser | null }) => {
    setUser(account.user);
    setPending(account.pending);
    if (account.user) setDevVerificationUrl(null);
    return account;
  }, []);

  const refresh = useCallback(async () => void apply(await loadAccount()), [apply]);

  useEffect(() => {
    let live = true;
    setSignedOutHandler(() => {
      void clearNativeCookies();
      setUser(null);
      setPending(null);
    });
    void loadAccount().then((account) => {
      if (!live) return;
      apply(account);
      if (account.user) void registerForPush();
    });
    void storage.get(AGE_KEY).then((v) => live && setAgeConfirmed(v === "yes"));
    return () => {
      live = false;
      setSignedOutHandler(null);
    };
  }, [apply]);

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      await clearNativeCookies();
      const res = await api<{ token?: string; emailVerified: boolean }>("/api/auth/login", { method: "POST", body: { identifier, password, client: "native" } });
      if (!res.token) throw new ApiError(500, { error: "No session token" });
      await saveToken(res.token);
      const account = apply(await loadAccount());
      if (account.user) void registerForPush();
    },
    [apply],
  );

  const signUp = useCallback(
    async (input: SignUpInput, form: SignUpForm, challengeToken: string | null) => {
      await clearNativeCookies();
      const res = await register(input, form, challengeToken);
      await saveToken(res.token);
      setDevVerificationUrl(res.devVerificationUrl ?? null);
      apply(await loadAccount());
    },
    [apply],
  );

  const checkVerified = useCallback(async () => {
    const account = apply(await loadAccount());
    if (account.user) void registerForPush();
    return Boolean(account.user);
  }, [apply]);

  const resendVerification = useCallback(async () => {
    const res = await api<{ alreadyVerified?: boolean; devVerificationUrl?: string }>("/api/auth/resend-verification", { method: "POST" });
    if (res.devVerificationUrl) setDevVerificationUrl(res.devVerificationUrl);
    if (res.alreadyVerified) await checkVerified();
  }, [checkVerified]);

  /**
   * Signs out for good (krizaka/orochia#127): the push token, then the session revoked on the server (a copy of the
   * token opens nothing any more), the token dropped from secure storage, the native cookie jar emptied — and every
   * screen's data forgotten (`useApi` listens to the session). The next person to sign in on this phone starts clean.
   */
  const signOut = useCallback(async () => {
    await unregisterPush();
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    await clearToken();
    await clearNativeCookies();
    setUser(null);
    setPending(null);
    setDevVerificationUrl(null);
  }, []);

  const confirmAge = useCallback(async () => {
    await storage.set(AGE_KEY, "yes");
    setAgeConfirmed(true);
  }, []);

  const value = useMemo(
    () => ({ user, pending, devVerificationUrl, ageConfirmed, signIn, signUp, checkVerified, resendVerification, signOut, confirmAge, refresh }),
    [user, pending, devVerificationUrl, ageConfirmed, signIn, signUp, checkVerified, resendVerification, signOut, confirmAge, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
