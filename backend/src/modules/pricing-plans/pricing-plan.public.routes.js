const express = require("express");
const router = express.Router();
const pricingPlanPublicController = require("./pricing-plan.public.controller");
const { pricingPlansPublicRateLimiter } = require("../../middlewares/rateLimit.middleware");

// Rate-limit nhe (IP-based) de chong spam. KHONG qua middleware auth.
router.use(pricingPlansPublicRateLimiter);

router.get("/", pricingPlanPublicController.listPlans);

module.exports = router;
