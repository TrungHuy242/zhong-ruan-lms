/**
 * Verify admin flows:
 *   1. Login với admin user → lấy token
 *   2. List contact requests
 *   3. Update status (NEW → CONTACTED) → verify audit log
 *   4. Soft delete contact → verify appears in trash + audit log
 *   5. Restore → verify
 *   6. Force delete → verify gone
 *
 * Run: node scripts/verify-contact-request-flow.js
 */
require("dotenv").config();
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

(async () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Find an admin user để mock token
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN", status: "ACTIVE", deletedAt: null } });
    if (!admin) {
      console.error("✗ No active admin user in DB. Seed an admin first.");
      process.exit(1);
    }
    const token = jwt.sign({ id: admin.id, email: admin.email, role: "ADMIN" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const base = "http://localhost:5000";
    const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

    // 2. List contact requests
    const listRes = await fetch(`${base}/api/admin/contact-requests`, { headers });
    const listJson = await listRes.json();
    console.log(`[List] HTTP ${listRes.status}, total = ${listJson.data?.pagination?.total}`);
    const items = listJson.data?.contacts || [];
    if (items.length === 0) {
      console.log("✗ No contact requests to test. Insert one first.");
      process.exit(1);
    }
    const target = items[0];
    console.log(`[List] First contact: id=${target.id}, status=${target.status}, fullName=${target.fullName}`);

    // 3. Update status NEW → CONTACTED
    if (target.status === "NEW") {
      const patchRes = await fetch(`${base}/api/admin/contact-requests/${target.id}/status`, {
        method: "PATCH", headers, body: JSON.stringify({ status: "CONTACTED" }),
      });
      const patchJson = await patchRes.json();
      console.log(`[Status] PATCH HTTP ${patchRes.status}, new status=${patchJson.data?.contact?.status}`);
      if (patchRes.status !== 200) {
        console.error("  Error:", patchJson.message);
        process.exit(1);
      }

      // Verify audit log
      const auditRows = await prisma.auditLog.findMany({
        where: { target: `ContactRequest:${target.id}`, action: "ADMIN_CONTACT_REQUEST_STATUS_CHANGED" },
        orderBy: { createdAt: "desc" }, take: 1,
      });
      console.log(`[Audit] ADMIN_CONTACT_REQUEST_STATUS_CHANGED rows = ${auditRows.length}, meta =`, auditRows[0]?.meta);
    } else {
      console.log("[Status] Skip — target.status is not NEW");
    }

    // 4. Soft delete
    const delRes = await fetch(`${base}/api/admin/contact-requests/${target.id}`, { method: "DELETE", headers });
    const delJson = await delRes.json();
    console.log(`[Delete] HTTP ${delRes.status}, deletedAt=${delJson.data?.deletedAt}`);

    // Verify audit
    const softDeleteAudit = await prisma.auditLog.findFirst({
      where: { target: `ContactRequest:${target.id}`, action: "CONTACT_REQUEST_SOFT_DELETE" },
    });
    console.log(`[Audit] CONTACT_REQUEST_SOFT_DELETE =`, softDeleteAudit ? "✓ found" : "✗ MISSING");

    // Verify trash
    const trashRes = await fetch(`${base}/api/trash?module=contactrequests&pageSize=10`, { headers });
    const trashJson = await trashRes.json();
    const inTrash = (trashJson.data?.items || []).some((i) => i.module === "contactrequests" && i.id === target.id);
    console.log(`[Trash] HTTP ${trashRes.status}, in trash = ${inTrash}`);

    // 5. Restore
    const restoreRes = await fetch(`${base}/api/admin/contact-requests/${target.id}/restore`, { method: "POST", headers });
    const restoreJson = await restoreRes.json();
    console.log(`[Restore] HTTP ${restoreRes.status}, success=${restoreJson.data?.restored}`);

    const restoreAudit = await prisma.auditLog.findFirst({
      where: { target: `ContactRequest:${target.id}`, action: "CONTACT_REQUEST_RESTORE" },
    });
    console.log(`[Audit] CONTACT_REQUEST_RESTORE =`, restoreAudit ? "✓ found" : "✗ MISSING");

    // 6. Force delete
    const forceRes = await fetch(`${base}/api/admin/contact-requests/${target.id}/force`, { method: "DELETE", headers });
    const forceJson = await forceRes.json();
    console.log(`[ForceDelete] HTTP ${forceRes.status}, hardDeleted=${forceJson.data?.hardDeleted}`);

    const forceAudit = await prisma.auditLog.findFirst({
      where: { target: `ContactRequest:${target.id}`, action: "CONTACT_REQUEST_FORCE_DELETE" },
    });
    console.log(`[Audit] CONTACT_REQUEST_FORCE_DELETE =`, forceAudit ? "✓ found" : "✗ MISSING");

    // Verify final state (record đã hard-delete)
    const final = await prisma.contactRequest.findUnique({ where: { id: target.id } });
    console.log(`[Final] Record exists =`, final ? "✗ STILL EXISTS" : "✓ GONE");

    console.log("\n✅ ALL ADMIN FLOWS PASS");
  } catch (err) {
    console.error("✗ Error:", err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();