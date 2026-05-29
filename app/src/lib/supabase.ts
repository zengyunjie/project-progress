import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vmtmctgcrwzjejqtnngp.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdG1jdGdjcnd6amVqcXRubmdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMTk0MTIsImV4cCI6MjA5NTU5NTQxMn0.UG6XLKuIi1klXNaljTQH3A2Bt_tBPrSG17077SCVJyg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: "public",
  },
});
