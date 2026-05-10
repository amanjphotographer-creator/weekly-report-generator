const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Anon client used only to verify the user's JWT
const supabaseVerify = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseAdmin = require("../db/supabase");

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.slice(7);

  const { data: { user }, error } = await supabaseVerify.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Attach staff record to request
  const { data: staffRow, error: staffErr } = await supabaseAdmin
    .from("staff")
    .select("id, name, role, is_active")
    .eq("id", user.id)
    .single();

  if (staffErr || !staffRow) {
    return res.status(403).json({ error: "User is not a registered staff member" });
  }

  if (!staffRow.is_active) {
    return res.status(403).json({ error: "Staff account is deactivated" });
  }

  req.user = { ...user, ...staffRow };
  next();
}

module.exports = { requireAuth };
