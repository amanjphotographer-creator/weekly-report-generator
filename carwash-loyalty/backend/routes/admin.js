const express = require("express");
const { z } = require("zod");
const router = express.Router();
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");
const { adminOnly } = require("../middleware/adminOnly");

// All admin routes require login + admin role
router.use(requireAuth, adminOnly);

// GET /api/admin/customers — paginated customer list
router.get("/customers", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const search = req.query.search?.trim();

  let query = supabase
    .from("customers")
    .select("id, name, phone, email, stamp_count, total_stamps, cycle, is_active, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("Admin customers list error:", error);
    return res.status(500).json({ error: "Failed to fetch customers" });
  }

  res.json({ customers: data, total: count, page, limit });
});

// GET /api/admin/analytics — aggregated dashboard stats
router.get("/analytics", async (req, res) => {
  const [
    customersResult,
    stampsResult,
    rewardsResult,
    recentScansResult,
    todayStampsResult,
  ] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("stamps").select("id", { count: "exact", head: true }),
    supabase.from("rewards").select("id", { count: "exact", head: true }),
    supabase
      .from("scan_logs")
      .select("id, action, scanned_at, customer_id, staff_id")
      .order("scanned_at", { ascending: false })
      .limit(20),
    supabase
      .from("stamps")
      .select("id", { count: "exact", head: true })
      .gte("stamped_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
  ]);

  res.json({
    total_customers: customersResult.count ?? 0,
    total_stamps: stampsResult.count ?? 0,
    total_free_washes_redeemed: rewardsResult.count ?? 0,
    stamps_today: todayStampsResult.count ?? 0,
    recent_activity: recentScansResult.data ?? [],
  });
});

// PATCH /api/admin/customers/:id — manual stamp adjustment (admin only)
const adjustSchema = z.object({
  stamp_count: z.number().int().min(0).max(5),
  notes: z.string().max(300).optional(),
});

router.patch("/customers/:id", async (req, res) => {
  const parsed = adjustSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  const { stamp_count, notes } = parsed.data;

  const { data, error } = await supabase
    .from("customers")
    .update({ stamp_count })
    .eq("id", req.params.id)
    .select("id, name, stamp_count")
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Customer not found or update failed" });
  }

  await supabase.from("scan_logs").insert({
    customer_id: data.id,
    staff_id: req.user.id,
    action: "adjust",
    ip_address: req.ip,
  });

  res.json({
    message: `Stamp count manually adjusted to ${stamp_count}`,
    customer: data,
    notes: notes || null,
  });
});

module.exports = router;
