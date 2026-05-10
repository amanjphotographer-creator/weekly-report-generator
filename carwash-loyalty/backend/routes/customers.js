const express = require("express");
const { z } = require("zod");
const router = express.Router();
const supabase = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");
const { generateQrToken, generateQrDataUrl } = require("../services/qrService");

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().optional(),
  email: z.string().email().optional(),
}).refine((d) => d.phone || d.email, {
  message: "At least one of phone or email is required",
});

// POST /api/customers — register a new customer (staff only)
router.post("/", requireAuth, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  const { name, phone, email } = parsed.data;
  const qr_token = generateQrToken();

  const { data, error } = await supabase
    .from("customers")
    .insert({ name, phone, email, qr_token })
    .select("id, name, phone, email, qr_token, stamp_count, cycle, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "A customer with this phone number already exists" });
    }
    console.error("Register customer error:", error);
    return res.status(500).json({ error: "Failed to register customer" });
  }

  // Log the action
  await supabase.from("scan_logs").insert({
    customer_id: data.id,
    staff_id: req.user.id,
    action: "view",
    ip_address: req.ip,
  });

  const qrDataUrl = await generateQrDataUrl(
    qr_token,
    process.env.FRONTEND_URL || "http://localhost:3000"
  );

  res.status(201).json({ customer: data, qrDataUrl });
});

// GET /api/customers/:token — get customer by QR token (public — used by card page)
router.get("/:token", async (req, res) => {
  const { token } = req.params;

  const { data, error } = await supabase
    .from("customers")
    .select("id, name, stamp_count, total_stamps, cycle, is_active, created_at")
    .eq("qr_token", token)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Customer not found" });
  }

  // Log the view
  await supabase.from("scan_logs").insert({
    customer_id: data.id,
    action: "view",
    ip_address: req.ip,
  });

  res.json({ customer: data });
});

// GET /api/customers/:token/history — full stamp + reward history (staff only)
router.get("/:token/history", requireAuth, async (req, res) => {
  const { token } = req.params;

  const { data: customer, error: custErr } = await supabase
    .from("customers")
    .select("id, name, stamp_count, total_stamps, cycle")
    .eq("qr_token", token)
    .single();

  if (custErr || !customer) {
    return res.status(404).json({ error: "Customer not found" });
  }

  const [stampsResult, rewardsResult] = await Promise.all([
    supabase
      .from("stamps")
      .select("id, stamped_at, cycle, notes, stamped_by")
      .eq("customer_id", customer.id)
      .order("stamped_at", { ascending: false })
      .limit(50),
    supabase
      .from("rewards")
      .select("id, redeemed_at, cycle, redeemed_by")
      .eq("customer_id", customer.id)
      .order("redeemed_at", { ascending: false }),
  ]);

  res.json({
    customer,
    stamps: stampsResult.data || [],
    rewards: rewardsResult.data || [],
  });
});

module.exports = router;
