import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://sovkcnzxystytgczpzic.supabase.co";
const supabaseAnonKey = "sb_publishable_RloyhngS45WwfOTnuBCk-Q_v4yYW048";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});