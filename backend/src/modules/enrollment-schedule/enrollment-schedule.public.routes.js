/**
 * enrollment-schedule.public.routes.js — Public routes cho module EnrollmentSchedule.
 *
 * GET /api/public/enrollment-schedule — Trả đúng 1 bản published có displayOrder thấp nhất.
 * Trả { schedule: null } nếu không có bản nào — caller FE xử lý ẩn block.
 */

const express = require("express");
const router = express.Router();
const ctrl = require("./enrollment-schedule.public.controller");

router.get("/", ctrl.getActive);

module.exports = router;
