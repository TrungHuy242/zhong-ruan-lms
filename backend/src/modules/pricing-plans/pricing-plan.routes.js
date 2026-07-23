const express = require("express");
const router = express.Router();
const pricingPlanController = require("./pricing-plan.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

// Tat ca route admin deu can auth + role ADMIN.
router.use(authenticate, authorizeRoles("ADMIN"));

router.get("/", pricingPlanController.getAllPlans);
router.post("/", pricingPlanController.createPlan);
router.get("/:id", pricingPlanController.getPlanById);
router.put("/:id", pricingPlanController.updatePlan);
router.delete("/:id", pricingPlanController.deletePlan);
router.post("/:id/restore", pricingPlanController.restorePlan);
router.delete("/:id/force", pricingPlanController.forceDeletePlan);

module.exports = router;
