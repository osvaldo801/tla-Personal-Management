import { createClient } from "@supabase/supabase-js";

const fallbackSupabaseUrl = "https://gyqqpuuldmopupxqpusk.supabase.co";
const fallbackSupabaseAnonKey = "sb_publishable_kElbwfv7vER1Iuj0XXPRvA_urbgBFlS";

const configuredSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
const configuredSupabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "";

const supabaseUrl = configuredSupabaseUrl || fallbackSupabaseUrl;
const supabaseAnonKey = configuredSupabaseAnonKey || fallbackSupabaseAnonKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
