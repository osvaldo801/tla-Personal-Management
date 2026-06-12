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
  isSuperAdmin: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const publicAppUrl = "https://tla-personal-management.vercel.app";

const demoProfile: AdminUser = {
  id: "demo-admin",
  full_name: "Osvaldo Vasquez",
  email: "osvaldo801@gmail.com",
  role: "super_admin",
  ministry_id: null,
  created_at: new Date().toISOString(),
};

const demoSession = {
  user: {
    id: "demo-admin",
    email: "osvaldo801@gmail.com",
  },
} as Session;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      if (!isSupabaseConfigured) {
        setSession(demoSession);
        setProfile(demoProfile);
        setIsLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;

      setSession(data.session);
      await ensureProfile(data.session?.user.id ?? null);
      setIsLoading(false);
    }

    async function ensureProfile(userId: string | null) {
      if (!userId) {
        setProfile(null);
        return;
      }

      await supabase.rpc("ensure_current_user_profile");
      await loadProfile(userId);
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
      await ensureProfile(nextSession?.user.id ?? null);
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
      isAdmin: profile?.role === "super_admin" || profile?.role === "admin" || profile?.role === "ministry_leader",
      isSuperAdmin: profile?.role === "super_admin",
      isLoading,
      signInWithGoogle: async () => {
        if (!isSupabaseConfigured) {
          setSession(demoSession);
          setProfile(demoProfile);
          return;
        }

        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: publicAppUrl,
          },
        });
      },
      signOut: async () => {
        if (!isSupabaseConfigured) {
          setSession(demoSession);
          setProfile(demoProfile);
          return;
        }

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
