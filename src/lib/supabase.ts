import { createClient } from "@supabase/supabase-js";

const fallbackSupabaseUrl = "https://gyqqpuuldmopupxqpusk.supabase.co";
const fallbackSupabaseAnonKey = "sb_publishable_kElbwfv7vER1Iuj0XXPRvA_urbgBFlS";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? fallbackSupabaseUrl;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? fallbackSupabaseAnonKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
