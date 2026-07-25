/**
 * banner.public.controller.js — Public API handlers cho module Banners.
 *
 * Base URL: /api/public/banners
 * No auth required.
 */

const bannerService = require("./banner.service");
const { tryCatch } = require("../../utils/asyncHandler");

const list = tryCatch(async (req, res) => {
  const banners = await bannerService.getPublicBanners();
  res.json({ banners });
});

module.exports = { list };
