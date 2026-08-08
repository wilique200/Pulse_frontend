import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Uses the ANON key here (safe to expose in frontend code) — this is
// intentionally different from the backend's service-role client.
// Row-level security is what keeps this key safe to ship to the browser.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
