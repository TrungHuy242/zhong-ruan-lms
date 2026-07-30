/**
 * enrollment-schedule.controller.js — Admin API handlers cho module EnrollmentSchedule.
 *
 * Base URL: /api/admin/enrollment-schedule
 * Auth: requireAdmin middleware đã apply ở route level.
 */

const service = require("./enrollment-schedule.service");
const { tryCatch } = require("../../utils/asyncHandler");

const list = tryCatch(async (req, res) => {
  const result = await service.listSchedules(req.query);
  res.json(result);
});

const getOne = tryCatch(async (req, res) => {
  const row = await service.getScheduleById(req.params.id);
  res.json(row);
});

const create = tryCatch(async (req, res) => {
  const row = await service.createSchedule(req.body, req.user?.id, req);
  res.status(201).json(row);
});

const update = tryCatch(async (req, res) => {
  const row = await service.updateSchedule(req.params.id, req.body, req.user?.id, req);
  res.json(row);
});

const remove = tryCatch(async (req, res) => {
  await service.deleteSchedule(req.params.id, req.user?.id, req);
  res.json({ ok: true });
});

const restore = tryCatch(async (req, res) => {
  const result = await service.restoreSchedule(req.params.id, req.user?.id, req);
  res.json(result);
});

const forceDelete = tryCatch(async (req, res) => {
  await service.forceDeleteSchedule(req.params.id, req.user?.id, req);
  res.json({ ok: true });
});

module.exports = { list, getOne, create, update, remove, restore, forceDelete };
