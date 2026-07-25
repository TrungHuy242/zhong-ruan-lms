/**
 * banner.public.routes.js — Public routes cho module Banners.
 *
 * GET /api/public/banners — Lấy banners đang active (published, not expired, not deleted)
 */

const express = require("express");
const router = express.Router();
const ctrl = require("./banner.public.controller");

router.get("/", ctrl.list);

module.exports = router;
