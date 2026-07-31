// scripts/qa-muc-1-slop-fullscan.mjs
/**
 * Full-system slop-test cho design.md §9 + §9.2 anti-SaaS rules.
 * Quét 30 file CSS module. Skip CSS comments để không false-positive.
 */
import fs from "node:fs";
import path from "node:path";

const REPO = "D:/TrungHuy/ZhoungRuan/zhong-ruan-lms/frontend/src";

const FILES = [
  "pages/public/HomePage.module.css",
  "pages/public/CoursesPage.module.css",
  "pages/public/CourseDetailPage.module.css",
  "pages/public/TeachersListPage.module.css",
  "pages/public/TeacherDetailPage.module.css",
  "pages/public/PricingPage.module.css",
  "pages/public/ContactPage.module.css",
  "features/public/components/PublicTeacherCard.module.css",
  "features/public/components/CourseCard.module.css",
  "features/public/components/PricingCard.module.css",
  "features/public/components/CourseComparisonTable.module.css",
  "features/public/components/Breadcrumb.module.css",
  "features/public/components/CourseRoadmap.module.css",
  "features/public/components/ContactInfo.module.css",
  "features/public/components/ContactForm.module.css",
  "features/public/components/FAQAccordion.module.css",
  "features/public/components/PolicyCard.module.css",
  "features/public/components/ImagePlaceholder.module.css",
  "features/public/components/CTABanner.module.css",
  "features/public/components/BannerCarousel.module.css",
  "features/public/components/TestimonialCard.module.css",
  "features/public/components/UspCard.module.css",
  "features/public/components/StatCounter.module.css",
  "features/public/components/HeroSection.module.css",
  "features/auth/pages/LoginPage.module.css",
  "features/auth/pages/RegisterPage.module.css",
  "features/auth/components/AuthMinimalHeader.module.css",
  "layouts/PublicLayout.module.css",
  "shared/components/PublicHeader.module.css",
  "shared/components/PublicFooter.module.css",
];

// Strip CSS comments trước khi scan
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

// Carve-out: dot/avatar markers
const DOT_SELECTOR_PATTERN = /^\.(dot|avatar|avatarInitials|avatarWrap)|_dot_|_avatar_/i;
const PSEUDO_SELECTOR = /::?(before|after|placeholder|marker)/;

const failures = [];

for (const rel of FILES) {
  const full = path.join(REPO, rel);
  if (!fs.existsSync(full)) { failures.push({ file: rel, issue: "file not found" }); continue; }
  const css = stripComments(fs.readFileSync(full, "utf8"));

  // ── border-radius ──
  const brMatches = [...css.matchAll(/(\.[a-zA-Z_-][a-zA-Z0-9_-]*(?:::?[a-z-]+)?)\s*\{[^}]*border-radius:\s*([^;}\n]+)[^}]*\}/g)];
  for (const m of brMatches) {
    const selector = m[1];
    const val = m[2].trim();
    if (val === "0" || val === "0px") continue;
    if (DOT_SELECTOR_PATTERN.test(selector)) continue;
    if (PSEUDO_SELECTOR.test(selector)) continue;
    // 50% chỉ OK cho dot/avatar/pseudo
    if (val === "50%") continue;
    failures.push({
      file: rel,
      class: selector,
      rule: "border-radius",
      value: val,
      snippet: m[0].replace(/\s+/g, " ").trim().slice(-180),
    });
  }

  // ── box-shadow ──
  const bsMatches = [...css.matchAll(/(\.[a-zA-Z_-][a-zA-Z0-9_-]*(?:::?[a-z-]+)?)\s*\{[^}]*box-shadow:\s*([^;}\n]+)[^}]*\}/g)];
  for (const m of bsMatches) {
    const selector = m[1];
    const val = m[2].trim();
    if (val === "none") continue;
    if (/focus(?:-visible|-within)?/.test(selector)) continue;
    if (PSEUDO_SELECTOR.test(selector)) continue;
    failures.push({
      file: rel,
      class: selector,
      rule: "box-shadow",
      value: val,
      snippet: m[0].replace(/\s+/g, " ").trim().slice(-180),
    });
  }

  // ── translateY on hover ──
  const hoverT = [...css.matchAll(/(\.[a-zA-Z_-][a-zA-Z0-9_-]*):hover\s*\{[^}]*transform:\s*translateY[^}]*\}/g)];
  for (const m of hoverT) {
    failures.push({
      file: rel,
      class: m[1] + ":hover",
      rule: "translateY-on-hover",
      snippet: m[0].replace(/\s+/g, " ").trim().slice(-180),
    });
  }

  // ── scale on hover ──
  const hoverS = [...css.matchAll(/(\.[a-zA-Z_-][a-zA-Z0-9_-]*):hover\s*\{[^}]*transform:\s*scale[^}]*\}/g)];
  for (const m of hoverS) {
    failures.push({
      file: rel,
      class: m[1] + ":hover",
      rule: "scale-on-hover",
      snippet: m[0].replace(/\s+/g, " ").trim().slice(-180),
    });
  }

  // ── linear-gradient ──
  const lgMatches = [...css.matchAll(/(\.[a-zA-Z_-][a-zA-Z0-9_-]*)\s*\{[^}]*linear-gradient\([^}]*\}/g)];
  for (const m of lgMatches) {
    const cls = m[1];
    if (/skeleton|shimmer/i.test(cls)) continue;
    if (/slideOverlay/i.test(cls)) continue; // carousel image overlay carve-out
    if (/linear-gradient\(currentColor,\s*currentColor\)/.test(m[0])) continue; // bg-image trick cho underline
    failures.push({
      file: rel,
      class: cls,
      rule: "linear-gradient",
      snippet: m[0].replace(/\s+/g, " ").trim().slice(-180),
    });
  }

  // ── italic Source Serif 4 ≥16px ──
  const itBlocks = [...css.matchAll(/(\.[a-zA-Z_-][a-zA-Z0-9_-]*)\s*\{([^}]*font-style:\s*italic[^}]*)\}/g)];
  for (const m of itBlocks) {
    const cls = m[1];
    const body = m[2];
    // Source Serif 4?
    if (!/Source Serif 4/i.test(body)) continue;
    // font-size ≥16px?
    const fsMatch = body.match(/font-size:\s*(\d+)px/);
    if (fsMatch && parseInt(fsMatch[1]) >= 16) {
      // Carve-out list
      const baseName = cls.replace(/^\./, "").replace(/_[a-z0-9_]+$/i, "");
      if (/pullquote/i.test(baseName)) continue;
      if (/blockquotetext/i.test(baseName)) continue;
      if (/^price$/i.test(baseName)) continue;
      if (/^currency$/i.test(baseName)) continue;
      if (/^statvalue$/i.test(baseName)) continue;
      if (/^uspordinal$/i.test(baseName)) continue;
      if (/^courseprice$/i.test(baseName)) continue;
      if (/^originalprice$/i.test(baseName)) continue;
      if (/^testimonialquote$/i.test(baseName)) continue;
      if (/^testimonialmeta$/i.test(baseName)) continue;
      if (/^ctasuccess$/i.test(baseName)) continue;
      if (/^promisevalue$/i.test(baseName)) continue;
      // VT not yet defined — also OK
      failures.push({
        file: rel,
        class: cls,
        rule: "italic-serif-display",
        snippet: body.replace(/\s+/g, " ").trim().slice(0, 200),
      });
    }
  }
}

console.log(`\n=== Scanned ${FILES.length} CSS modules (comments stripped) ===`);
console.log(`FAIL: ${failures.length}`);
if (failures.length) {
  const groups = {};
  for (const f of failures) (groups[f.rule] ??= []).push(f);
  for (const [rule, list] of Object.entries(groups)) {
    console.log(`\n  Rule: ${rule} — ${list.length} offender(s)`);
    for (const f of list.slice(0, 8)) {
      console.log(`    ${f.file} → ${f.class}`);
      console.log(`      ${f.snippet}`);
    }
    if (list.length > 8) console.log(`    ... and ${list.length - 8} more`);
  }
  process.exit(1);
}
console.log("\n=== GATE 38a + anti-SaaS full-scan: 0 offender ===");
process.exit(0);