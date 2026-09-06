const SUPABASE_URL = "https://sssuzwgylwbvcxfrtfiq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_f6Vuttl39auQJigHuh26lw_kLq9ZoFB";

export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL;

export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  SUPABASE_PUBLISHABLE_KEY;
