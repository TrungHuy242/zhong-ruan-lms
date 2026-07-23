const pricingPlanService = require("./pricing-plan.service");

// =====================================================================
// PUBLIC handlers (KHONG can auth)
// =====================================================================

async function listPlans(req, res) {
  try {
    const result = await pricingPlanService.listPublicPlans(req.query || {});
    res.json({
      message: "Lay danh sach goi hoc phi thanh cong",
      data: { plans: result.plans, total: result.total },
    });
  } catch (error) {
    res.status(500).json({ message: "Loi he thong" });
  }
}

module.exports = {
  listPlans,
};
