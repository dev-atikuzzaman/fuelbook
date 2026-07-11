import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "⚠️ Supabase env var পাওয়া যায়নি (REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY). " +
      "Vercel Project Settings → Environment Variables এ বসাও, অথবা লোকালে .env.local বানাও।"
  );
}

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const IMAGES_BUCKET = "app-images";
export const FILES_BUCKET = "app-files";
