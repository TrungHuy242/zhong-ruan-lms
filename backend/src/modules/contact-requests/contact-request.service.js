/**
 * contact-request.service.js — Business logic cho module ContactRequest.
 *
 * Chia 2 nhom ham:
 *   - Public: createContact (gửi form từ website, có gửi email thông báo).
 *   - Admin:  listContacts, getContactById, updateStatus, deleteContact,
 *             restoreContact, forceDeleteContact.
 *
 * Quy tắc:
 *   - Validate input o service (khoi dung validator rieng).
 *   - Soft-delete/restore qua helper utils/softDelete (ghi audit tu dong).
 *   - Public create: lưu DB TRƯỚC, gửi email SAU. Nếu email lỗi → log + vẫn trả 200
 *     (data DB quan trọng hơn việc notify qua email).
 *   - Audit ghi qua audit.log / audit.logFromRequest.
 */

const contactRequestRepository = require("./contact-request.repository");
const emailService = require("../email/email.service");
const { softDelete, restore, forceDelete } = require("../../utils/softDelete");
const { notDeletedWhere, parseFlags } = require("../../utils/softQuery");
const audit = require("../audit/audit.service");
const {
  validateContactPayload,
  validateStatus,
  notFound,
  ALLOWED_STATUSES,
} = require("./contact-request.helpers");

const SORTABLE_FIELDS = {
  fullName: "fullName",
  email: "email",
  phone: "phone",
  status: "status",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

const ALLOWED_LIMITS = [10, 20, 50, 100];

function buildBaseWhere(query, flags) {
  const where = notDeletedWhere({}, flags);
  const keyword = (query.keyword ?? query.search ?? "").toString().trim();
  if (keyword) {
    where.OR = [
      { fullName: { contains: keyword, mode: "insensitive" } },
      { email: { contains: keyword, mode: "insensitive" } },
      { phone: { contains: keyword } },
      { message: { contains: keyword, mode: "insensitive" } },
    ];
  }
  if (query.status) {
    const s = String(query.status);
    if (ALLOWED_STATUSES.has(s)) where.status = s;
  }
  return where;
}

function parsePagination(query) {
  const rawLimit = Number(query.limit);
  const limit = ALLOWED_LIMITS.includes(rawLimit) ? rawLimit : 20;
  const page = Math.max(1, Number(query.page) || 1);
  const skip = (page - 1) * limit;
  return { limit, page, skip };
}

function parseSort(query) {
  const sortBy = SORTABLE_FIELDS[query.sortBy] ? query.sortBy : "createdAt";
  const sortOrder = String(query.sortOrder).toLowerCase() === "asc" ? "asc" : "desc";
  return { orderBy: [{ [sortBy]: sortOrder }, { id: sortOrder }] };
}

// =====================================================================
// PUBLIC
// =====================================================================

/**
 * Public — người dùng gửi form liên hệ.
 *
 * Flow:
 *   1. Validate payload.
 *   2. Lưu vào DB (status mặc định "NEW").
 *   3. Gọi emailService.sendContactNotification(...) — KHÔNG throw,
 *      nếu lỗi chỉ log để không làm fail request.
 *   4. Trả record cho FE.
 *
 * Lưu ý:
 *   - Ghi audit PUBLIC_CONTACT_REQUEST_CREATED để admin có thể truy vết
 *     lượt submit theo IP (chống spam).
 *   - Email chỉ gửi khi đã set ENV CONTACT_NOTIFICATION_EMAIL.
 */
async function createContact(payload, req) {
  validateContactPayload(payload, { isUpdate: false });

  const data = {
    fullName: String(payload.fullName).trim(),
    phone: String(payload.phone).trim(),
    email: String(payload.email).trim().toLowerCase(),
    message: String(payload.message).trim(),
    // status mặc định do Prisma @default("NEW") xử lý
  };

  const created = await contactRequestRepository.createContact(data);

  // Ghi audit (không user đăng nhập → userId: null).
  await audit.logFromRequest(req, {
    userId: null,
    action: "PUBLIC_CONTACT_REQUEST_CREATED",
    target: `ContactRequest:${created.id}`,
    meta: {
      id: created.id,
      fullName: created.fullName,
      email: created.email,
      status: created.status,
    },
  });

  // Gửi email thông báo (KHÔNG throw).
  const notificationEmail = process.env.CONTACT_NOTIFICATION_EMAIL;
  if (notificationEmail) {
    const result = await emailService.sendContactNotification({
      to: notificationEmail,
      fullName: created.fullName,
      phone: created.phone,
      email: created.email,
      message: created.message,
      requestId: created.id,
    });
    // Log outcome để admin debug nếu cần
    if (!result.ok) {
      console.error(
        "[contact-request.service] Email notification failed for",
        created.id,
        "— error:",
        result.error
      );
    } else if (result.dryRun) {
      console.log(
        "[contact-request.service] Email skipped (dry-run, SMTP not configured) for",
        created.id
      );
    }
  } else {
    console.warn(
      "[contact-request.service] CONTACT_NOTIFICATION_EMAIL chưa cấu hình — bỏ qua gửi email cho",
      created.id
    );
  }

  return created;
}

// =====================================================================
// ADMIN
// =====================================================================

async function listContacts(query = {}) {
  const flags = parseFlags(query);
  const { limit, page, skip } = parsePagination(query);
  const where = buildBaseWhere(query, flags);
  const { orderBy } = parseSort(query);

  const { items, total } = await contactRequestRepository.findContactsPaginated({
    where,
    orderBy,
    skip,
    take: limit,
  });
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  // Stats phụ (counts by status) — chỉ 1 query groupBy nhỏ.
  const statusCounts = await contactRequestRepository.countByStatus();

  return {
    contacts: items,
    pagination: { page, limit, total, totalPages },
    stats: {
      byStatus: {
        NEW: statusCounts.NEW || 0,
        CONTACTED: statusCounts.CONTACTED || 0,
        CLOSED: statusCounts.CLOSED || 0,
      },
    },
  };
}

async function getContactById(id) {
  const contact = await contactRequestRepository.findContactById(String(id));
  if (!contact) throw notFound();
  return contact;
}

/**
 * Đổi status (NEW/CONTACTED/CLOSED).
 * Idempotent: set cùng status vẫn ghi audit (admin xác nhận).
 */
async function updateStatus(id, payload, req) {
  const next = validateStatus(payload && payload.status);
  if (!next) {
    const e = new Error("status là bắt buộc");
    e.code = "BAD_REQUEST";
    throw e;
  }

  const current = await contactRequestRepository.findContactByIdIncludeDeleted(String(id));
  if (!current) throw notFound();
  if (current.deletedAt) {
    throw notFound("Yêu cầu đã bị xoá, không thể cập nhật trạng thái");
  }

  const updated = await contactRequestRepository.updateContact(current.id, { status: next });

  await audit.log({
    userId: req.user.id,
    action: "ADMIN_CONTACT_REQUEST_STATUS_CHANGED",
    target: `ContactRequest:${updated.id}`,
    meta: {
      id: updated.id,
      from: current.status,
      to: next,
    },
    ip: req && req.ip,
    userAgent: req && req.headers && req.headers["user-agent"],
  });

  return updated;
}

async function deleteContact(id, currentUserId, req) {
  const contact = await contactRequestRepository.findContactByIdIncludeDeleted(String(id));
  if (!contact) throw notFound();

  if (contact.deletedAt) {
    return { id: contact.id, fullName: contact.fullName, deletedAt: contact.deletedAt, alreadyDeleted: true };
  }

  const deleted = await softDelete("ContactRequest", { id: String(id) }, { req, userId: currentUserId });
  if (!deleted) throw notFound();
  return { id: deleted.id, fullName: deleted.fullName, deletedAt: deleted.deletedAt };
}

async function restoreContact(id, currentUserId, req) {
  const contact = await contactRequestRepository.findContactByIdIncludeDeleted(String(id));
  if (!contact) throw notFound();

  const restored = await restore("ContactRequest", { id: String(id) }, { req, userId: currentUserId });
  if (!restored) throw notFound("Không thể khôi phục yêu cầu liên hệ");
  return { id: restored.id, fullName: restored.fullName, deletedAt: restored.deletedAt };
}

async function forceDeleteContact(id, currentUserId, req) {
  const contact = await contactRequestRepository.findContactByIdIncludeDeleted(String(id));
  if (!contact) throw notFound();

  await forceDelete("ContactRequest", { id: String(id) }, { req, userId: currentUserId });
  return { id: String(id), hardDeleted: true };
}

module.exports = {
  // Public
  createContact,
  // Admin
  listContacts,
  getContactById,
  updateStatus,
  deleteContact,
  restoreContact,
  forceDeleteContact,
};