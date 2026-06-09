import { createContext, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { OrganizationSettings } from "../types";
import { DEFAULT_ORGANIZATION } from "../types";

type OrganizationContextValue = {
  settings: OrganizationSettings;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(null);
const SETTINGS_ID = DEFAULT_ORGANIZATION.id;

async function fetchOrganizationSettings() {
  if (!isSupabaseConfigured) {
    return DEFAULT_ORGANIZATION;
  }

  const { data, error } = await supabase
    .from("organization_settings")
    .select("*")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error) throw error;
  return (data as OrganizationSettings | null) ?? DEFAULT_ORGANIZATION;
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["organization-settings"],
    queryFn: fetchOrganizationSettings,
    initialData: DEFAULT_ORGANIZATION,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel("organization-settings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "organization_settings",
          filter: `id=eq.${SETTINGS_ID}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["organization-settings"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const value = useMemo<OrganizationContextValue>(
    () => ({
      settings: query.data ?? DEFAULT_ORGANIZATION,
      isLoading: query.isLoading,
      error: query.error,
      refresh: async () => {
        await query.refetch();
      },
    }),
    [query],
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganizationSettings() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganizationSettings must be used inside OrganizationProvider");
  }
  return context;
}
