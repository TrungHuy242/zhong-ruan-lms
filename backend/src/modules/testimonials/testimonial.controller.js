/**
 * testimonial.controller.js — Admin API handlers cho module Testimonial.
 *
 * Base URL: /api/admin/testimonials
 * Auth: requireAdmin middleware đã apply ở route level.
 *
 * Response envelope (đồng bộ với teacher controller):
 *   {
 *     message: "...",
 *     data: { testimonial } | { testimonials, pagination } | { ... }
 *   }
 */

const service = require("./testimonial.service");
const { tryCatch } = require("../../utils/asyncHandler");

const list = tryCatch(async (req, res) => {
  const result = await service.listTestimonials(req.query);
  res.json({
    message: "Lấy danh sách đánh giá thành công",
    data: result,
  });
});

const getOne = tryCatch(async (req, res) => {
  const row = await service.getTestimonialById(req.params.id);
  res.json({
    message: "Lấy đánh giá thành công",
    data: { testimonial: row },
  });
});

const create = tryCatch(async (req, res) => {
  const row = await service.createTestimonial(req.body, req.user?.id, req);
  res.status(201).json({
    message: "Tạo đánh giá thành công",
    data: { testimonial: row },
  });
});

const update = tryCatch(async (req, res) => {
  const row = await service.updateTestimonial(req.params.id, req.body, req.user?.id, req);
  res.json({
    message: "Cập nhật đánh giá thành công",
    data: { testimonial: row },
  });
});

const remove = tryCatch(async (req, res) => {
  const result = await service.deleteTestimonial(req.params.id, req.user?.id, req);
  res.json({
    message: "Xóa đánh giá thành công",
    data: result,
  });
});

const restore = tryCatch(async (req, res) => {
  const result = await service.restoreTestimonial(req.params.id, req.user?.id, req);
  res.json({
    message: "Khôi phục đánh giá thành công",
    data: result,
  });
});

const forceDelete = tryCatch(async (req, res) => {
  const result = await service.forceDeleteTestimonial(req.params.id, req.user?.id, req);
  res.json({
    message: "Đã xóa vĩnh viễn đánh giá",
    data: result,
  });
});

module.exports = { list, getOne, create, update, remove, restore, forceDelete };
