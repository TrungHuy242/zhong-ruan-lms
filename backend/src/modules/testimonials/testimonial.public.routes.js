/**
 * testimonial.public.routes.js — Public routes cho module Testimonial.
 *
 * GET /api/public/testimonials — Trả danh sách testimonial published.
 *  - Query: ?limit=N (optional, giới hạn số lượng trả về).
 *  - Không truyền limit → trả tất cả (FE tự quyết định hiển thị bao nhiêu).
 */

const express = require("express");
const router = express.Router();
const ctrl = require("./testimonial.public.controller");

router.get("/", ctrl.list);

module.exports = router;