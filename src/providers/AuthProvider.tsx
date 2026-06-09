import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { AdminUser } from "../types";

type AuthContextValue = {
  session: Session | null;
  authUser: User | null;
  profile: AdminUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      if (!isSupabaseConfigured) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;

      setSession(data.session);
      await loadProfile(data.session?.user.id ?? null);
      setIsLoading(false);
    }

    async function loadProfile(userId: string | null) {
      if (!userId) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, role, ministry_id, created_at")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        setProfile(null);
        return;
      }

      setProfile(data as AdminUser | null);
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      await loadProfile(nextSession?.user.id ?? null);
      setIsLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      authUser: session?.user ?? null,
      profile,
      isAdmin: profile?.role === "admin",
      isLoading,
      signInWithGoogle: async () => {
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin,
          },
        });
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [isLoading, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
