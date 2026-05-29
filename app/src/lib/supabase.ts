import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vmtmctgcrwzjejqtnngp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdG1jdGdjcnd6amVqcXRubmdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMTk0MTIsImV4cCI6MjA5NTU5NTQxMn0.UG6XLKuIi1klXNaljTQH3A2Bt_tBPrSG17077SCVJyg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
