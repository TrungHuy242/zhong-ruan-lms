/**
 * enrollment-schedule.public.controller.js — Public API handlers cho module EnrollmentSchedule.
 *
 * Base URL: /api/public/enrollment-schedule
 * No auth required.
 */

const service = require("./enrollment-schedule.service");
const { tryCatch } = require("../../utils/asyncHandler");

const getActive = tryCatch(async (req, res) => {
  const result = await service.getPublicActiveSchedule();
  res.json(result);
});

module.exports = { getActive };
