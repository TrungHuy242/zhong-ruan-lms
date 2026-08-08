/**
 * testimonial.controller.js — Admin API handlers cho module Testimonial.
 *
 * Base URL: /api/admin/testimonials
 * Auth: requireAdmin middleware đã apply ở route level.
 */

const service = require("./testimonial.service");
const { tryCatch } = require("../../utils/asyncHandler");

const list = tryCatch(async (req, res) => {
  const result = await service.listTestimonials(req.query);
  res.json(result);
});

const getOne = tryCatch(async (req, res) => {
  const row = await service.getTestimonialById(req.params.id);
  res.json(row);
});

const create = tryCatch(async (req, res) => {
  const row = await service.createTestimonial(req.body, req.user?.id, req);
  res.status(201).json(row);
});

const update = tryCatch(async (req, res) => {
  const row = await service.updateTestimonial(req.params.id, req.body, req.user?.id, req);
  res.json(row);
});

const remove = tryCatch(async (req, res) => {
  await service.deleteTestimonial(req.params.id, req.user?.id, req);
  res.json({ ok: true });
});

const restore = tryCatch(async (req, res) => {
  const result = await service.restoreTestimonial(req.params.id, req.user?.id, req);
  res.json(result);
});

const forceDelete = tryCatch(async (req, res) => {
  await service.forceDeleteTestimonial(req.params.id, req.user?.id, req);
  res.json({ ok: true });
});

module.exports = { list, getOne, create, update, remove, restore, forceDelete };