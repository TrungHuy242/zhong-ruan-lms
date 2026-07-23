const pricingPlanService = require("./pricing-plan.service");

function statusFromError(error) {
  let status = 400;
  if (error.code === "NOT_FOUND") status = 404;
  else if (error.code === "FORBIDDEN") status = 403;
  else if (error.code === "BAD_REQUEST") status = 400;
  return status;
}

// =====================================================================
// ADMIN handlers
// =====================================================================

async function getAllPlans(req, res) {
  try {
    const result = await pricingPlanService.listPlans(req.query || {});
    res.json({
      message: "Lay danh sach goi hoc phi thanh cong",
      data: { plans: result.plans, pagination: result.pagination },
    });
  } catch (error) {
    res.status(500).json({ message: "Loi he thong" });
  }
}

async function createPlan(req, res) {
  try {
    const plan = await pricingPlanService.createPlan(req.body, req);
    res.status(201).json({
      message: "Tao goi hoc phi thanh cong",
      data: { plan },
    });
  } catch (error) {
    res.status(statusFromError(error)).json({ message: error.message });
  }
}

async function getPlanById(req, res) {
  try {
    const plan = await pricingPlanService.getPlanById(req.params.id);
    res.json({
      message: "Lay thong tin goi hoc phi thanh cong",
      data: { plan },
    });
  } catch (error) {
    res.status(statusFromError(error)).json({ message: error.message });
  }
}

async function updatePlan(req, res) {
  try {
    const plan = await pricingPlanService.updatePlan(req.params.id, req.body, req);
    res.json({
      message: "Cap nhat goi hoc phi thanh cong",
      data: { plan },
    });
  } catch (error) {
    res.status(statusFromError(error)).json({ message: error.message });
  }
}

async function deletePlan(req, res) {
  try {
    const result = await pricingPlanService.deletePlan(req.params.id, req.user.id, req);
    res.json({
      message: "Da chuyen goi hoc phi vao thung rac (soft delete)",
      data: result,
    });
  } catch (error) {
    res.status(statusFromError(error)).json({ message: error.message });
  }
}

async function restorePlan(req, res) {
  try {
    const result = await pricingPlanService.restorePlan(req.params.id, req.user.id, req);
    res.json({
      message: "Khoi phuc goi hoc phi thanh cong",
      data: result,
    });
  } catch (error) {
    res.status(statusFromError(error)).json({ message: error.message });
  }
}

async function forceDeletePlan(req, res) {
  try {
    const result = await pricingPlanService.forceDeletePlan(req.params.id, req.user.id, req);
    res.json({
      message: "Da xoa cung goi hoc phi khoi database",
      data: result,
    });
  } catch (error) {
    res.status(statusFromError(error)).json({ message: error.message });
  }
}

module.exports = {
  getAllPlans,
  createPlan,
  getPlanById,
  updatePlan,
  deletePlan,
  restorePlan,
  forceDeletePlan,
};
