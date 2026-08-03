const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Service-role client — bypasses RLS, server-side only
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

module.exports = supabase;
