const express = require("express");
const router = express.Router();
const supabase = require("../db/supabase");
const { generateApplePass } = require("../services/appleWallet");
const { generateGoogleWalletUrl } = require("../services/googleWallet");

// GET /api/wallet/apple/:token — download Apple Wallet .pkpass
router.get("/apple/:token", async (req, res) => {
  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, name, qr_token, stamp_count, cycle, is_active")
    .eq("qr_token", req.params.token)
    .single();

  if (error || !customer || !customer.is_active) {
    return res.status(404).json({ error: "Customer not found" });
  }

  try {
    const passBuffer = await generateApplePass(customer);
    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader("Content-Disposition", `attachment; filename="carwash-loyalty.pkpass"`);
    res.send(passBuffer);
  } catch (err) {
    console.error("Apple Wallet generation error:", err.message);
    res.status(501).json({
      error: err.message,
      help: "Apple Wallet certificates must be set up. See PLAN.md Phase 5.",
    });
  }
});

// GET /api/wallet/google/:token — redirect to Google Wallet save URL
router.get("/google/:token", async (req, res) => {
  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, name, qr_token, stamp_count, cycle, is_active")
    .eq("qr_token", req.params.token)
    .single();

  if (error || !customer || !customer.is_active) {
    return res.status(404).json({ error: "Customer not found" });
  }

  try {
    const saveUrl = generateGoogleWalletUrl(customer);
    res.redirect(saveUrl);
  } catch (err) {
    console.error("Google Wallet generation error:", err.message);
    res.status(501).json({
      error: err.message,
      help: "Google Wallet must be configured. See PLAN.md Phase 5.",
    });
  }
});

module.exports = router;
