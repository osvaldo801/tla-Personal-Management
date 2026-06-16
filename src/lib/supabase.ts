import { createClient } from "@supabase/supabase-js";

const configuredSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
const configuredSupabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "";

export const isSupabaseConfigured = Boolean(configuredSupabaseUrl && configuredSupabaseAnonKey);

const supabaseUrl = isSupabaseConfigured ? configuredSupabaseUrl : "https://not-configured.supabase.co";
const supabaseAnonKey = isSupabaseConfigured ? configuredSupabaseAnonKey : "not-configured";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
