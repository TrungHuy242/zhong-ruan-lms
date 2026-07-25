/**
 * banner.controller.js — Admin API handlers cho module Banners.
 *
 * Base URL: /api/admin/banners
 * Auth: requireAdmin middleware đã apply ở route level.
 */

const bannerService = require("./banner.service");
const { tryCatch } = require("../../utils/asyncHandler");

const list = tryCatch(async (req, res) => {
  const result = await bannerService.listBanners(req.query);
  res.json(result);
});

const getOne = tryCatch(async (req, res) => {
  const row = await bannerService.getBannerById(req.params.id);
  res.json(row);
});

const create = tryCatch(async (req, res) => {
  const row = await bannerService.createBanner(req.body, req.user?.id, req);
  res.status(201).json(row);
});

const update = tryCatch(async (req, res) => {
  const row = await bannerService.updateBanner(req.params.id, req.body, req.user?.id, req);
  res.json(row);
});

const remove = tryCatch(async (req, res) => {
  await bannerService.deleteBanner(req.params.id, req.user?.id, req);
  res.json({ ok: true });
});

const restore = tryCatch(async (req, res) => {
  const result = await bannerService.restoreBanner(req.params.id, req.user?.id, req);
  res.json(result);
});

const forceDelete = tryCatch(async (req, res) => {
  await bannerService.forceDeleteBanner(req.params.id, req.user?.id, req);
  res.json({ ok: true });
});

module.exports = { list, getOne, create, update, remove, restore, forceDelete };
