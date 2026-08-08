/**
 * testimonial.public.controller.js — Public API handlers cho module Testimonial.
 *
 * Base URL: /api/public/testimonials
 * No auth required.
 */

const service = require("./testimonial.service");
const { tryCatch } = require("../../utils/asyncHandler");

/**
 * GET /api/public/testimonials?limit=N
 * Trả danh sách testimonial đã published, sort displayOrder ASC.
 * Không truyền limit → trả tất cả (FE tự quyết định hiển thị bao nhiêu).
 */
const list = tryCatch(async (req, res) => {
  const result = await service.listPublicTestimonials(req.query);
  res.json(result);
});

module.exports = { list };