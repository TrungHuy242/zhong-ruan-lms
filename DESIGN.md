# DESIGN.md — Design System tổng thể (Zhong Ruan Rebrand)

> **Mục đích**: File này là nguồn chân lý (single source of truth) về màu sắc, typography,
> spacing, component chuẩn cho **toàn bộ project** — áp dụng cho mọi màn hình (Login, Dashboard,
> danh sách, form, chi tiết, cài đặt...), không riêng cho màn hình nào.
> Cursor/AI code phải luôn tham chiếu file này trước khi dựng bất kỳ UI mới nào, dùng đúng
> biến màu/token bên dưới, không tự bịa màu hoặc hard-code hex rải rác trong component.

> **Nguồn màu**: Bảng màu được suy luận từ nhận diện thương hiệu công khai của "Tiếng Trung
> Online Zhong Ruan" (tông đỏ – vàng gold đặc trưng văn hóa Trung Hoa) vì trang gốc chặn
> crawler nên không lấy được hex CSS gốc 100% chính xác. Nếu có ảnh/brand guideline thật,
> chỉ cần thay giá trị trong khối `:root` — toàn bộ project dùng biến nên tự động ăn theo.

> **Định hướng UI**: Giao diện làm lại **hoàn toàn mới** theo phong cách SaaS/Admin Dashboard
> hiện đại (card bo tròn, shadow mềm, spacing thoáng, rõ ràng, chuyên nghiệp) — chỉ giữ lại
> màu thương hiệu + nội dung/nghiệp vụ cũ, không copy layout hay cách trình bày cũ.

---

## 1. Color Tokens (áp dụng toàn project)

```css
:root {
  /* ===== Brand - Primary (đỏ Trung Hoa) ===== */
  --brand-primary: #C8102E;
  --brand-primary-hover: #A50C24;
  --brand-primary-active: #8A0A1E;
  --brand-primary-light: #FDEAEC;   /* nền nhạt: badge, alert, highlight row */
  --brand-primary-lighter: #FFF5F6; /* nền rất nhạt: hover row, background nhẹ */

  /* ===== Brand - Accent (vàng gold) ===== */
  --brand-accent: #D4AF37;
  --brand-accent-hover: #B6942C;
  --brand-accent-light: #FBF3D9;

  /* ===== Neutral (nền, viền, chữ — dùng cho MỌI màn hình) ===== */
  --bg-page: #F7F7F9;        /* nền chung toàn app */
  --bg-surface: #FFFFFF;     /* nền card, modal, table, form */
  --bg-surface-alt: #FAFAFB; /* nền phụ: header table, hover nhẹ */
  --border-default: #E5E7EB;
  --border-strong: #D1D5DB;
  --text-primary: #1A1A1E;
  --text-secondary: #6B7280;
  --text-placeholder: #9CA3AF;
  --text-disabled: #C4C7CC;
  --text-on-primary: #FFFFFF; /* chữ trên nền brand-primary */

  /* ===== Semantic (dùng chung: toast, badge trạng thái, validate...) ===== */
  --color-success: #16A34A;
  --color-success-bg: #ECFDF3;
  --color-error: #DC2626;
  --color-error-bg: #FEF2F2;
  --color-warning: #D97706;
  --color-warning-bg: #FFFBEB;
  --color-info: #2563EB;
  --color-info-bg: #EFF6FF;

  /* ===== Radius & Shadow (dùng chung mọi component) ===== */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-full: 999px;
  --shadow-sm: 0 1px 2px rgba(20, 20, 30, 0.04);
  --shadow-card: 0 8px 24px rgba(20, 20, 30, 0.06);
  --shadow-modal: 0 16px 48px rgba(20, 20, 30, 0.16);
  --shadow-focus-ring: 0 0 0 4px rgba(200, 16, 46, 0.12);

  /* ===== Spacing scale (dùng chung, đơn vị px, theo bội số 4) ===== */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
}
```

**Nguyên tắc dùng màu (áp dụng mọi màn hình):**
- Tỷ lệ tổng thể: **60% neutral** (nền/chữ/viền) – **30% đỏ** (CTA, active state, link quan trọng, biểu đồ chính) – **10% vàng gold** (điểm nhấn: icon, badge đặc biệt, viền logo, highlight nhẹ).
- `--brand-primary`: nút hành động chính (Submit, Lưu, Xác nhận), tab/menu đang active, link quan trọng, trạng thái focus của input.
- `--brand-accent`: chỉ dùng làm chi tiết nhấn nhá (icon nổi bật, badge "Nổi bật/VIP", gạch chân tiêu đề, hover nhẹ trên sidebar) — **không** dùng làm nền lớn hay nút chính vì dễ chói và giảm độ tương phản chữ.
- Semantic colors (`success/error/warning/info`) dùng thống nhất cho mọi toast, validate, badge trạng thái trong toàn app — không tự chế thêm màu trạng thái khác.
- Không hard-code hex trong component; luôn gọi qua biến (CSS var / Tailwind token tương ứng).

### Map sang Tailwind (nếu stack dùng Tailwind)
```js
// tailwind.config.js (trích đoạn)
theme: {
  extend: {
    colors: {
      brand: {
        DEFAULT: 'var(--brand-primary)',
        hover: 'var(--brand-primary-hover)',
        active: 'var(--brand-primary-active)',
        light: 'var(--brand-primary-light)',
      },
      accent: {
        DEFAULT: 'var(--brand-accent)',
        hover: 'var(--brand-accent-hover)',
        light: 'var(--brand-accent-light)',
      },
      surface: 'var(--bg-surface)',
      page: 'var(--bg-page)',
    },
    borderRadius: {
      sm: 'var(--radius-sm)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
    },
    boxShadow: {
      card: 'var(--shadow-card)',
      modal: 'var(--shadow-modal)',
    },
  },
}
```

---

## 2. Typography (dùng chung toàn project)

- Font chính: `Inter` hoặc `Be Vietnam Pro` (hỗ trợ dấu tiếng Việt tốt, phong cách SaaS hiện đại).
- Font phụ (số liệu/bảng): có thể dùng `Inter` tabular-nums để số thẳng cột trong table.

| Cấp | Size | Weight | Dùng cho |
|---|---|---|---|
| H1 | 28–32px | 700 | Tiêu đề trang (VD: "Đăng nhập", "Quản lý học viên") |
| H2 | 22–24px | 600 | Tiêu đề section trong trang |
| H3 | 18px | 600 | Tiêu đề card/block nhỏ |
| Body | 14–15px | 400 | Nội dung chính, input text |
| Label | 13–14px | 500 | Label form, tiêu đề cột table |
| Caption | 12px | 400 | Ghi chú phụ, timestamp, helper text |
| Button | 14–15px | 600 | Text trên mọi nút |

Màu chữ mặc định: `--text-primary` cho nội dung chính, `--text-secondary` cho phụ đề/ghi chú, `--text-placeholder` cho placeholder input.

---

## 3. Component chuẩn (áp dụng cho MỌI màn hình trong project)

### 3.1 Button
- **Primary**: nền `--brand-primary`, chữ `--text-on-primary`, `radius: --radius-md`, hover `--brand-primary-hover`, active `--brand-primary-active`, disabled: opacity 40% + không hover.
- **Secondary/Outline**: viền `--border-strong`, chữ `--text-primary`, nền trong suốt, hover nền `--bg-surface-alt`.
- **Danger**: nền `--color-error`, dùng cho hành động Xoá/Huỷ vĩnh viễn.
- **Ghost/Text button**: không nền không viền, chữ `--brand-primary`, dùng cho hành động phụ (VD: "Quên mật khẩu?", "Huỷ").
- Kích thước chuẩn: `sm` (32px height), `md` (40px height, mặc định), `lg` (48px height).
- Loading state: disable + spinner nhỏ bên trong, giữ nguyên width để tránh layout nhảy.

### 3.2 Input / Form field
- Height mặc định 40–44px, `radius: --radius-sm`, viền `--border-default`.
- Focus: viền `--brand-primary` + `box-shadow: --shadow-focus-ring`.
- Error: viền `--color-error`, text lỗi 12–13px màu `--color-error` ngay dưới input, kèm icon cảnh báo nếu cần.
- Label luôn nằm trên input (top-aligned), không dùng placeholder thay label.
- Input có icon phụ (eye toggle, search icon, clear button...) căn giữa theo chiều dọc, cách mép phải input 12px.
- Disabled: nền `--bg-surface-alt`, chữ `--text-disabled`, không cho tương tác.

### 3.3 Card / Panel
- Nền `--bg-surface`, `radius: --radius-lg`, `shadow: --shadow-card`, padding 24–32px.
- Dùng làm khối chứa chính cho: form, bảng thống kê, chi tiết item...

### 3.4 Table (danh sách dữ liệu — dùng nhiều trong Admin Dashboard)
- Header: nền `--bg-surface-alt`, chữ `--text-secondary`, weight 600, uppercase nhẹ hoặc không tuỳ gu.
- Row hover: nền `--brand-primary-lighter`.
- Row đang chọn/active: nền `--brand-primary-light`.
- Border giữa các row: `--border-default`, 1px, không dùng border quá đậm.
- Pagination/action cuối bảng: căn phải hoặc giữa tuỳ layout, dùng button `sm`.

### 3.5 Badge / Tag trạng thái
- Success: nền `--color-success-bg`, chữ `--color-success`.
- Error: nền `--color-error-bg`, chữ `--color-error`.
- Warning: nền `--color-warning-bg`, chữ `--color-warning`.
- Info/Default: nền `--color-info-bg`, chữ `--color-info`.
- Đặc biệt/nổi bật (VIP, Premium...): nền `--brand-accent-light`, chữ `--brand-accent-hover`.
- Radius: `--radius-full`, padding ngang 10–12px, chữ 12px weight 600.

### 3.6 Modal / Dialog
- Nền `--bg-surface`, `radius: --radius-lg`, `shadow: --shadow-modal`, overlay nền đen 40% opacity.
- Header modal có tiêu đề (H3) + nút đóng (X) góc phải.
- Footer modal: 2 nút (Huỷ = ghost/outline, Xác nhận = primary hoặc danger tuỳ ngữ cảnh), căn phải.

### 3.7 Alert / Toast (thông báo hệ thống)
- Dùng 4 màu semantic ở trên, icon tương ứng bên trái, nội dung ngắn gọn, có nút đóng.
- Toast tự ẩn sau 3–5s (trừ error quan trọng có thể giữ lâu hơn hoặc cần bấm đóng).

### 3.8 Navigation (Sidebar/Topbar cho Dashboard)
- Sidebar nền `--bg-surface`, item active: nền `--brand-primary-light`, chữ + icon `--brand-primary`.
- Item hover (chưa active): nền `--bg-surface-alt`.
- Topbar: nền `--bg-surface`, có avatar user, có thể dùng `--brand-accent` cho icon thông báo (chấm đỏ dùng `--color-error` để dễ nhận biết số lượng chưa đọc).

### 3.9 Empty state / Loading skeleton
- Empty state: icon minh hoạ đơn giản (line-art, màu `--text-placeholder` hoặc `--brand-accent` nhạt), text `--text-secondary`, có thể kèm 1 CTA (button primary) nếu phù hợp ngữ cảnh.
- Skeleton loading: nền `--bg-surface-alt` với hiệu ứng shimmer nhẹ, dùng thay cho spinner khi load danh sách/table.

---

## 4. Layout patterns chung

- **Trang có form đơn lẻ, không cần sidebar** (Login, Register, Quên mật khẩu, Onboarding...): dùng bố cục split-screen hoặc form căn giữa full màn hình, card `--radius-lg` + `--shadow-card`.
- **Trang quản trị/Dashboard** (danh sách, chi tiết, cài đặt...): layout chuẩn Sidebar (trái, cố định) + Topbar (trên) + Content area (nền `--bg-page`, chứa các Card/Table).
- Content area luôn có padding tối thiểu `--space-6` (24px) trên desktop, `--space-4` (16px) trên mobile.
- Max-width content: gợi ý 1280–1440px trên màn hình lớn, căn giữa, tránh kéo dài hết viewport gây khó đọc.

---

## 5. Responsive breakpoints (áp dụng toàn project)

| Breakpoint | Mô tả |
|---|---|
| ≥1280px | Desktop lớn: sidebar full, nhiều cột |
| 1024–1279px | Desktop nhỏ/tablet ngang: sidebar có thể thu gọn (icon-only) |
| 768–1023px | Tablet: sidebar ẩn, dùng menu hamburger; form/card full width có max-width |
| <768px | Mobile: mọi thứ full width, input/button tối thiểu 44px height để dễ chạm, khoảng cách phần tử tăng nhẹ để tránh bấm nhầm |

---

## 6. Accessibility & UX chung

- Contrast chữ/nền tối thiểu đạt chuẩn WCAG AA (đặc biệt chú ý chữ trắng trên `--brand-primary` và chữ trên `--brand-accent-light`).
- Mọi trạng thái tương tác (hover/focus/active/disabled) phải có khác biệt rõ ràng, không chỉ dựa vào màu sắc (thêm icon/underline khi cần cho người khiếm thị màu).
- Input/button có `focus-visible` rõ ràng (dùng `--shadow-focus-ring`) để hỗ trợ điều hướng bàn phím.
- Thông báo lỗi luôn đi kèm text mô tả cụ thể, không chỉ đổi màu viền đỏ.

---

## 7. Ghi chú áp dụng cho Cursor AI

- File này là **design system dùng chung cho toàn bộ project**, mọi màn hình (Login, Dashboard, danh sách, form nghiệp vụ, cài đặt, chi tiết...) đều phải dựng dựa trên token + component chuẩn ở trên.
- Khi tạo màn hình mới: ưu tiên tái sử dụng component đã định nghĩa (Button, Input, Card, Table, Badge, Modal, Alert...) thay vì tạo style riêng lẻ từng nơi.
- Chỉ giữ lại từ giao diện cũ: **màu thương hiệu** (đỏ + vàng gold) và **nội dung/nghiệp vụ** (tên thương hiệu, slogan, dữ liệu, trường thông tin...). Toàn bộ layout, spacing, cách trình bày component là **thiết kế mới**, theo chuẩn SaaS/Admin Dashboard hiện đại.
- Nếu một màn hình cụ thể (VD: Login) cần chi tiết bố cục riêng, sẽ có file mô tả riêng cho màn đó (VD: `screens/login.md`) — nhưng màu sắc/token/component vẫn phải lấy từ file `DESIGN.md` này, không định nghĩa lại.

---

## 8. Public/Marketing Site — bổ sung

Phần này dành cho 5 trang marketing (Home / Courses / Teachers / Pricing / Contact) — tách hẳn khỏi Admin shell nhưng vẫn dùng chung design tokens ở mục 1–7. Mục tiêu: tạo bộ mặt thương hiệu nhất quán với Admin nhưng có phong cách marketing riêng (hero lớn, animation, CTA nổi bật hơn).

### 8.1 Token bổ sung (chỉ dùng cho marketing)

| Token | Giá trị | Mô tả |
|---|---|---|
| `--hero-gradient` | `linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-active) 100%)` | Background cho hero section, banner lớn |
| `--hero-gradient-accent` | `linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-accent) 100%)` | Background hero nhấn vàng gold, dùng cho trang đặc biệt (VD: Landing giảm giá) |
| `--section-spacing` | `80px` (desktop) / `48px` (mobile) | Padding-top + padding-bottom mặc định cho mỗi section marketing |

Các token này KHÔNG thay thế token Admin — Admin vẫn dùng `--brand-primary` đơn sắc. Public có thêm gradient + section spacing thoáng hơn vì làm landing page.

### 8.2 Layout pattern Public

- **Container chính**: `max-width: 1280px`, `margin: 0 auto`, `padding: 0 var(--space-6)`. Trên mobile `padding: 0 var(--space-4)`.
- **Section**: padding-top + padding-bottom = `--section-spacing`. Nếu cần section sát nhau, dùng `--space-6` thay.
- **Section tone**: xen kẽ `--bg-page` (sáng nhạt) và `--bg-surface` (trắng) để tạo nhịp phân khu rõ ràng khi user cuộn.
- **PublicLayout**: full viewport height, header sticky 72px (64px mobile), footer đỏ đậm `var(--brand-primary-active)`. Tách hẳn với `AdminLayout` (có Sidebar + Topbar).

### 8.3 Typography Public (kế thừa mục 2 + bổ sung)

| Cấp | Size | Weight | Dùng cho |
|---|---|---|---|
| Hero H1 | 48–56px desktop / 32px mobile | 800 | Tiêu đề lớn trên hero section |
| Hero subtitle | 18–20px | 400 | Mô tả ngắn dưới H1 hero |
| Section H2 | 32–40px | 700 | Tiêu đề section lớn (VD: "Khóa học nổi bật") |
| Section H3 | 22–24px | 600 | Tiêu đề card trong section |

Font vẫn dùng `Be Vietnam Pro` + `Inter` như Admin, đã import trong `index.html`.

### 8.4 Chính sách animation

| Ngữ cảnh | Admin | Public |
|---|---|---|
| Hover/transition | Tối giản (150ms ease) | Tối giản (150ms ease) — giống Admin |
| Fade-in on scroll | Không dùng | Khuyến khích (200–400ms ease-out) |
| Count-up số liệu | Không dùng | Khuyến khích (dùng `useCountUp` hook đã có) |
| Drawer/menu | Sidebar collapse | Hamburger drawer slide-down mobile |

Public có animation nhiều hơn vì mục tiêu marketing là **gây ấn tượng**. Admin tối giản vì mục tiêu là **thao tác nhanh, không gây rối**.

### 8.5 Component mới cần cho Public (chỉ liệt kê — implement ở task sau)

| Component | Mô tả ngắn |
|---|---|
| `HeroSection` | H1 lớn + subtitle + 1-2 CTA button, nền `--hero-gradient` hoặc ảnh nền |
| `CTABanner` | Banner ngang full-width, 1 câu kêu gọi + 1 button, dùng giữa các section |
| `TestimonialCard` | Card đánh giá học viên: avatar, tên, cấp HSK, nội dung, rating 5 sao |
| `PricingCard` | Card gói giá: tên gói, giá, danh sách tính năng, nút CTA, highlight gói phổ biến |
| `TeacherCard` | Card giảng viên: ảnh, tên, chứng chỉ, kinh nghiệm, nút "Đặt học thử" |
| `StatCounter` | Số liệu lớn có animation count-up (dùng `useCountUp`), label ngắn bên dưới |
| `FAQAccordion` | Câu hỏi thường gặp dạng accordion (mở/đóng từng item) |
| `Logo` | Logo dùng chung (đã có sẵn ở `public/logo/logo-full.png`) |

Các component này sẽ được tạo ở các task tiếp theo, **không implement trong task hạ tầng này**.

---

## 9. Public Editorial Marketing System — Variants section

> **Scope**: 5 trang marketing public — HomePage, CoursesPage, CourseDetailPage,
> PricingPage, TeachersListPage, TeacherDetailPage, ContactPage. Locked từ
> vòng redesign 7–9 (HomePage) + vòng redesign 14 (CoursesPage / CourseDetailPage) +
> vòng redesign 3 component shared (CourseCard, CourseComparisonTable, CTABanner).
>
> **Kế thừa**: Brand anchor (red #C8102E + gold #D4AF37) + semantic colors
> từ Section 1. Thay đổi: shape language, typography pairing, radius/shadow
> stance, button voice, CTA banner system.
>
> **Khi nào dùng system này**: Bất kỳ trang public nào (route `/`, `/khoa-hoc*`,
> `/giang-vien*`, `/bang-gia`, `/lien-he`). Khi redesign từng trang, dùng
> các triết lý dưới đây làm mặc định — CHỈ vi phạm khi có lý do thiết kế cụ thể.

### 9.1 Page-scope tokens (chỉ dùng cho Public Editorial)

```css
:root {
  /* ===== Paper & Ink (ivory editorial — khác với Admin #F7F7F9/#FFFFFF) ===== */
  --zr-paper:        #FAF7F2;  /* ivory chính — section nền chính */
  --zr-paper-dark:   #1A1A1E;  /* charcoal — CTA banner, dark beat */
  --zr-ink:          #1A1A1E;  /* heading + body chính */
  --zr-ink-soft:     #4A4540;  /* body text phụ */
  --zr-ink-muted:    #6B6058;  /* caption, helper text */
  --zr-rule:         #D9D0C3;  /* hairline border, ivory paper */
  --zr-rule-dark:    #3D362B;  /* hairline border trên paper-dark */
  --zr-surface:      #FFFFFF;  /* card background, table row */

  /* ===== Brand anchor (mirror từ Section 1) ===== */
  --zr-brand:        var(--brand-primary);     /* #C8102E */
  --zr-brand-hover:  var(--brand-primary-hover); /* #A50C24 */
  --zr-brand-soft:   #E8B8BF;  /* border hover bg */
  --zr-gold:         var(--brand-accent);      /* #D4AF37 */
  --zr-gold-soft:    #F5EDD4;  /* gold tint subtle */

  /* ===== Typography (LOCKED — 2 fonts, 1 purpose) ===== */
  --zr-font-serif: "Source Serif 4", "Georgia", serif;
  --zr-font-body:  "Be Vietnam Pro", "Inter", system-ui, sans-serif;

  /* ===== Type scale (clamp-driven, responsive) ===== */
  /* display 36–58px | h2 28–48px | h3 17–24px | body 13–17px | small 11–13px */

  /* ===== Letter-spacing (an toàn Vietnamese subset) ===== */
  --zr-track-tight: -0.005em;  /* max cho heading */
  --zr-track-flat:  0;         /* eyebrow / body */

  /* ===== Motion (LOCKED — single opacity reveal) ===== */
  --zr-ease:        cubic-bezier(0.16, 1, 0.3, 1); /* editorial ease-out */
  --zr-dur:         900ms;     /* reveal default */
  --zr-dur-reveal:  1200ms;    /* page-level reveal */
  --zr-dur-fast:    220ms;     /* hover, focus */

  /* ===== NO radius, NO shadow (quantitative stance) ===== */
  /* border-radius: 0 toàn bộ;
   * box-shadow: none toàn bộ — KHÔNG dùng --shadow-card / --shadow-sm.
   * Depth đến từ border-top hairline + solid paper color, không từ shadow.
   */
}
```

### 9.2 Anti-SaaS rules (bắt buộc — KHÔNG vi phạm)

| Tell | KHÔNG dùng | Dùng thay |
|------|-----------|-----------|
| `border-radius` | `var(--radius-lg)`, `var(--radius-md)`, `var(--radius-full)` | **`0`** mọi nơi |
| `box-shadow` | `var(--shadow-card)`, `var(--shadow-sm)`, `var(--shadow-modal)` | **none** — depth bằng border hairline |
| Gradient hero | `linear-gradient(135deg, brand-primary, brand-primary-active)` | **Solid `--zr-paper-dark`** charcoal + hairline top brand-red 2px |
| Pill badge | `border-radius: full` + bg fill | **Uppercase label với hairline rule 16px** (vertical bar phía trước) |
| Hover scale | `transform: scale(1.03)` | **Border-color shift** sang brand-red |
| Bg-fill quote | `background: brand-primary-lighter` + `border-left: 3px` | **Border-top hairline + italic text** (editorial voice) |
| Italic headers | `font-style: italic` trên display type | **Roman headings**, italic chỉ dùng cho body emphasis + numerals |
| Tag-left pattern | Hanging header (eyebrow trái, heading phải) | **Vertical stack** — tag trên, heading dưới |
| Glassmorphism | `backdrop-filter: blur` + rgba bg | **Solid paper** + hairline borders |
| Equal-padding rows | `padding: 24px` mọi card | **Per-component clamp()** — mỗi section rhythm riêng |
| Motion `transform` | `translateY(-2px)` hover | **Background shift** đơn giản, hoặc `gap` shift trên arrow link |

### 9.3 Typography pairing (LOCKED — chỉ 2 font, 1 purpose)

| Role | Font | Weight | Letter-spacing | Use |
|------|------|--------|----------------|-----|
| Display heading | `--zr-font-serif` (Source Serif 4) | 400 / 600 / 700 | `0` → `-0.005em` | H1, H2, section title, course name, price |
| Body | `--zr-font-body` (Be Vietnam Pro) | 400 / 500 / 600 | `0` | Description, meta, label, CTA button |
| Eyebrow / label | `--zr-font-body` (Be Vietnam Pro) | 600 | `0.18em` uppercase | Section eyebrow, badge label, table header |
| Numerals (CSS) | `--zr-font-serif` italic | 400 | `-0.02em` | Stat counters, large price figures |

**Vietnamese subset**: Source Serif 4 + Be Vietnam Pro đều có Vietnamese subset
(file `.woff2` vietnamese đã được `@fontsource` load đầy đủ). Giữ
`letter-spacing ≤ -0.005em` là an toàn.

### 9.4 Component contracts (LOCKED — kế thừa cho mọi trang public)

#### 9.4.1 Eyebrow (section header label)
```css
.eyebrow {
  font-family: var(--zr-font-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--brand-primary);
  font-style: normal;  /* italic banned */
}
```
Stack vertical: eyebrow trên, heading dưới cùng cột. KHÔNG `tag-left / heading-right`.

#### 9.4.2 Heading (display)
```css
.heading {
  font-family: var(--zr-font-serif);
  font-size: clamp(28px, 3.2vw, 44px);  /* per-section override */
  font-weight: 400;  /* roman, không italic */
  line-height: 1.15;
  letter-spacing: 0;
  color: var(--zr-ink);
  text-wrap: balance;
  overflow-wrap: anywhere;  /* gate 51 — long Vietnamese words */
  min-width: 0;
}
```

#### 9.4.3 Card (CourseCard, TeacherCard, PricingCard)
```css
.card {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.2vw, 16px);
  padding: clamp(20px, 2.4vw, 32px);
  background: var(--zr-paper);
  border: 1px solid var(--zr-rule);
  border-top: 3px solid var(--zr-rule);  /* featured override → brand-red */
  border-radius: 0;
  transition: border-color 250ms var(--zr-ease);
}
.card:hover {
  border-color: var(--zr-brand);
  border-top-color: var(--zr-brand);
}
```
**Không shadow, không scale, không rounded.**

#### 9.4.4 Level badge / status label (uppercase, hairline rule)
```css
.levelBadge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--zr-font-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--zr-brand);
  background: transparent;  /* no fill */
  border: none;
  border-radius: 0;
}
.levelBadge::before {
  content: "";
  width: 16px;
  height: 1px;
  background: var(--zr-brand);
}
```

#### 9.4.5 CTA button (primary)
```css
.ctaBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: clamp(14px, 1.6vw, 18px) clamp(36px, 4vw, 56px);
  background: var(--zr-brand);
  color: var(--zr-paper);
  font-family: var(--zr-font-body);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 2px solid var(--zr-brand);
  border-radius: 0;
  box-shadow: none;
  transition: background 220ms var(--zr-ease), border-color 220ms var(--zr-ease),
    gap 200ms var(--zr-ease);
}
.ctaBtn:hover {
  background: var(--zr-brand-hover);
  border-color: var(--zr-brand-hover);
  gap: 14px;
}
.ctaBtn::after {
  content: "→";
  display: inline-block;
  transition: transform 200ms var(--zr-ease);
}
.ctaBtn:hover::after { transform: translateX(3px); }
.ctaBtn:focus-visible {
  outline: 2px solid var(--zr-paper);
  outline-offset: 3px;
}
```

#### 9.4.6 CTA banner (cuối trang — shared dùng 5 trang)
```css
.banner {
  background: var(--zr-paper-dark);  /* solid charcoal, KHÔNG gradient */
  padding: clamp(80px, 10vw, 128px) clamp(24px, 5vw, 80px);
  position: relative;
  overflow: hidden;
}
.banner::before {
  /* Hairline top brand-red 2px — match section rhythm */
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--zr-brand);
}
.headline {
  font-family: var(--zr-font-serif);
  font-size: clamp(28px, 3.6vw, 48px);
  font-weight: 400;
  color: var(--zr-paper);
  text-wrap: balance;
}
```

### 9.5 Section rhythm (mỗi trang chọn 1, KHÔNG lặp giữa các trang)

| Section bg | Token | Dùng cho |
|------------|-------|----------|
| Ivory paper | `var(--zr-paper)` | Hero, sections chính, banner-bg |
| Surface white | `var(--zr-surface)` | Cards, table, FAQ accordion |
| Paper-dark | `var(--zr-paper-dark)` | CTA banner cuối trang, dark beat |
| Admin gray | `var(--bg-page)` | Chỉ dùng ở CoursesPage giữa các section (đã lock) |

Padding section dùng `clamp()` responsive, ví dụ `clamp(72px, 9vw, 120px)` —
KHÔNG dùng uniform `var(--space-12)` 48px.

### 9.6 Motion stance (single opacity reveal — KHÔNG multi-reveal)

- **Single reveal primitive**: `opacity: 0 → 1` transition qua `IntersectionObserver`.
- **Duration**: `--zr-dur-reveal` 1200ms (page-level) / `--zr-dur` 900ms (component).
- **Easing**: `--zr-ease` (cubic-bezier(0.16, 1, 0.3, 1)) — KHÔNG dùng `ease`,
  `ease-in-out`, `ease-in-out` Linear.
- **Hover**: `transform: opacity` / `background` / `border-color` / `gap` shifts
  trong 200–250ms. KHÔNG `transform: translateY(-2px)` hoặc `scale(1.03)`.
- **Reduced-motion**: `transition-duration: 150ms` + `opacity` crossfade.
- **Focus-visible**: Hiện outline 2px brand primary instant, KHÔNG animate ring.

### 9.7 Shared component library (CSS Modules — đã ship)

| Component | File | Used in |
|-----------|------|---------|
| `CourseCard` | `features/public/components/CourseCard.module.css` | CoursesPage, CourseDetailPage |
| `CourseComparisonTable` | `features/public/components/CourseComparisonTable.module.css` | CoursesPage |
| `CTABanner` | `features/public/components/CTABanner.module.css` | 5 trang public |
| `FAQAccordion` | `features/public/components/FAQAccordion.module.css` | HomePage, CourseDetailPage, PricingPage |
| `Breadcrumb` | `features/public/components/Breadcrumb.module.css` | Tất cả trang public |
| `CourseRoadmap` | `features/public/components/CourseRoadmap.module.css` | CourseDetailPage |

**Khi tạo trang mới (TeachersListPage redesign, PricingPage redesign, etc.)**:
1. Đọc phần 9.1–9.6 của file này trước.
2. Pick macrostructure phù hợp (khác với trang đã ship — check `.hallmark/log.json`).
3. Import các shared component từ bảng trên — KHÔNG viết lại CSS cho card/banner.
4. Mọi màu mới phải refer `--zr-*` token; nếu thiếu, thêm token ở 9.1 rồi mới dùng.

### 9.8 Rules for next redesign (TeachersListPage, PricingPage, ContactPage)

1. **Đọc file này trước** (Section 9.1–9.7).
2. **Pick macrostructure KHÁC** với đã ship: HomePage (8-section editorial grid),
   CoursesPage (14-Narrative Workflow), CourseDetailPage (14-Narrative Workflow).
   Options còn lại: Marquee Hero, Stat-Led, Workbench, Letter, Quote-Led, Bento, etc.
3. **Theme**: Giữ editorial — ĐỪNG đổi sang theme khác. System đã lock.
4. **Hero / section rhythm**: Tạo khác với Trang chủ (đã dùng 5fr/4fr asymmetric).
   Ví dụ: PricingPage có thể dùng full-bleed masthead + 3-col asymmetric grid.
5. **CTA banner**: Dùng `CTABanner` shared — đã redesign editorial sẵn, đừng viết lại.
6. **Fonts**: Source Serif 4 + Be Vietnam Pro. KHÔNG thêm font mới.
7. **Palette**: ivory + ink + brand-red + brand-gold. KHÔNG thêm màu.
8. **Motion**: Single opacity reveal. KHÔNG count-up nếu trang chưa có.
9. **Slop test**: 58/58 phải pass. Gate 38a (italic headers), 49 (two-line clickable),
   51 (overflow-wrap), 54 (tag-left pattern) — 4 gate hay fail nhất.

### 9.9 Locked fingerprint (dùng cho audit tự động)

```
Audience visual fingerprint:
- Paper: ivory #FAF7F2 (chuẩn), charcoal #1A1A1E (CTA), white #FFFFFF (card)
- Ink: #1A1A1E heading, #4A4540 body, #6B6058 muted
- Brand: #C8102E primary, #D4AF37 accent, #A50C24 hover
- Display: Source Serif 4 (no italic on display)
- Body: Be Vietnam Pro (tracking 0.18em on uppercase labels)
- Shape: 0 radius, 0 shadow, hairline borders only
- Motion: single opacity reveal, 1200ms ease-out, 220ms hover
- CTA: solid brand-red button, no ghost, no shadow, no scale

Slop-test sentinel (mọi trang phải pass):
- 0 border-radius values khác 0
- 0 box-shadow values khác none
- 0 linear-gradient trên CTA banner
- 0 italic trên heading display
- 0 transform: scale / translateY trên hover
- 1 single reveal primitive (opacity only)
```

---

## 10. Admin Dashboard System — Hallmark (khác Public §9)

> **Scope**: Lớp vỏ (shell) của 13 trang admin — `AdminLayout` + `Sidebar` +
> `Header` + `Footer` (`frontend/src/app/layouts/*`). Tất cả trang con bên
> trong `/dashboard`, `/users`, `/teachers`, `/files`, ... đều nằm trong
> shell này. Khi redesign từng trang con, **BẮT BUỘC dùng token + component
> chuẩn §10** để đồng bộ.
>
> **Kế thừa**: Brand anchor (đỏ `#C8102E` + gold `#D4AF37`) + neutral + semantic
> colors từ §1. **KHÔNG kế thừa** ivory paper / 0-radius / 0-shadow / Source Serif 4
> từ §9 Public — Admin cần depth + density riêng.
>
> **Audience**: Admin/nhân viên nội bộ, dùng hàng ngày, cần thao tác nhanh,
> quét bảng dữ liệu nhiều — KHÔNG phải khách hàng cần thuyết phục.

### 10.1 Page-scope tokens (chỉ dùng cho Admin shell)

File: `frontend/src/styles/admin-tokens.css` — import sau `tokens.css` trong `main.tsx`.

```css
:root {
  /* ===== Font — ép Be Vietnam Pro cho toàn shell =====
   * (Public dùng Source Serif 4 + Be Vietnam Pro mix theo §9;
   * Admin đơn nhất Be Vietnam Pro để dễ đọc ở cỡ nhỏ 12-13px table cell) */
  --font-admin: "Be Vietnam Pro", "Inter", system-ui, sans-serif;

  /* ===== Letter-spacing (chống tách dấu tiếng Việt) ===== */
  --admin-track-display: -0.02em;
  --admin-track-heading: -0.01em;
  --admin-track-flat: 0;

  /* ===== Radius (siết nhỏ hơn §1 để phù hợp data density) =====
   * §1: sm 8 / md 12 / lg 20. Admin: input 6 / control 8 — bo vừa đủ
   * để phân tách form/button khỏi nền, KHÔNG "pill" SaaS quá đà. */
  --admin-radius-input: 6px;
  --admin-radius-control: 8px;
  --admin-radius-pill: 999px;

  /* ===== Shadow (depth tokens cho control/card/elevated) ===== */
  --admin-shadow-control: 0 1px 2px rgba(20, 20, 30, 0.08);
  --admin-shadow-elevated: 0 4px 16px rgba(20, 20, 30, 0.10);
  --admin-focus-ring: 0 0 0 3px rgba(200, 16, 46, 0.18);

  /* ===== Sidebar geometry (data-density friendly) ===== */
  --admin-sidebar-width: 256px;
  --admin-sidebar-width-collapsed: 72px;

  /* ===== Header / Footer geometry ===== */
  --admin-header-height: 64px;
  --admin-footer-height: 44px;

  /* ===== Content padding ===== */
  --admin-content-padding-desktop: var(--space-6);  /* 24px */
  --admin-content-padding-mobile: var(--space-4);   /* 16px */

  /* ===== Typography scale (compact, scan-friendly) =====
   * H1 page title 24px (nhỏ hơn §9 Public H1 để scan nhanh).
   * Body 14px, table cell 13px, label 12px uppercase 0.08em. */
  --admin-text-page-title: 24px;
  --admin-text-section-title: 18px;
  --admin-text-body: 14px;
  --admin-text-table-cell: 13px;
  --admin-text-label-uppercase: 12px;
}
```

### 10.2 Shape language (KHÁC Public §9 — đây là Admin riêng)

| Tell | Admin (KHÔNG dùng §9) | Public §9 (KHÔNG dùng cho Admin) |
|------|----------------------|--------------------------------|
| `border-radius` | `var(--admin-radius-input)` 6px, `var(--admin-radius-control)` 8px | 0 (hairline) |
| `box-shadow` | `var(--admin-shadow-control)` + `var(--admin-shadow-elevated)` | none |
| Active nav | Nền `--brand-primary-light` + **3px left bar** `--brand-primary` | Tag-left / heading-right |
| Hover card | `border-color` shift + `--admin-shadow-control` lift | Border-color shift only |
| Font | **Be Vietnam Pro only** (geometric-sans) | Source Serif 4 + Be Vietnam Pro (high-contrast-serif + sans) |
| Italic heading | **KHÔNG** | **KHÔNG** (cả 2 system đều ban) |
| Gradient | **KHÔNG** (Admin đơn sắc) | `--hero-gradient` ở CTA banner |
| Tag-left pattern | **KHÔNG** | **KHÔNG** |
| Motion | **Motion-cut** — hover 120ms, sidebar 200ms cubic-bezier(0.16, 1, 0.3, 1) | Single opacity reveal 1200ms |

### 10.3 Component contracts cho Admin shell

#### 10.3.1 Sidebar (nav)
- **Container**: `width: var(--admin-sidebar-width)`, fixed-left, nền `--bg-surface`, border-right 1px `--border-default`.
- **Active nav item**: `background-color: var(--brand-primary-light)` + `::before` 3px left bar `var(--brand-primary)`.
- **Collapsed mode**: width 72px, ẩn accordion header + label, icon-only. Active = top bar 3px (thay left bar vì sidebar quá hẹp).
- **Scrollbar**: custom 6px width, color `--border-default` thumb, `--border-strong` hover.

#### 10.3.2 Header (top bar)
- **Sticky top**, height 64px, nền `--bg-surface`, border-bottom 1px `--border-default`.
- **Hamburger**: chỉ hiện ≤1023px (mobile drawer trigger).
- **Bell button**: 40×40, color `--text-secondary` (KHÔNG dùng gold — để giảm noise màu). Badge count `--color-error` với outline `--bg-surface` 2px.
- **User avatar**: 32×32, nền `--brand-primary`, chữ trắng, font-weight 700. Pill button ở desktop, icon-only ≤480px.

#### 10.3.3 Dropdown (bell + user)
- **Container**: 360px (bell) / 220px (user), nền `--bg-surface`, border 1px `--border-default`, `box-shadow: var(--admin-shadow-elevated)` (KHÔNG dùng `--shadow-modal` 48px blur — quá mạnh).
- **Animation**: `dropdownFadeIn` 120ms (`opacity` + `translateY(-4px → 0)`). Tắt khi `prefers-reduced-motion`.
- **Bell item unread**: dot 8×8 `--brand-primary` + title `font-weight: 600`.

#### 10.3.4 Footer
- **Height**: 44px (down từ §1 48px), split trái–phải:
  - **Trái**: copyright (12px, `--text-secondary`).
  - **Phải**: system status (green dot 6×6 `--color-success` + text) + version (VD: `v1.0.0`).

### 10.4 Rules cho redesign trang con (13 trang admin)

1. **Đọc §10.1–10.3** trước khi tạo component.
2. **Import `admin-tokens.css`** (đã có sẵn trong `main.tsx`). KHÔNG tự định nghĩa hex/radius mới.
3. **Sử dụng token** `--admin-*` cho mọi geometry/typography/radius/shadow. KHÔNG dùng `--radius-lg`, `--shadow-card` (đó là Public marketing pattern).
4. **Active state** dùng pattern `--brand-primary-light` bg + 3px left bar (Section 10.3.1).
5. **Focus-visible** luôn dùng `box-shadow: var(--admin-focus-ring)` 3px (Section 10.1).
6. **Transition** dùng `cubic-bezier(0.16, 1, 0.3, 1)` cho chevron/sidebar; `120ms ease` cho hover đơn giản.
7. **Reduced motion** — tắt transition cho sidebar/main/chevron, bỏ `dropdownFadeIn`.
8. **Slop test** — gate quan trọng nhất:
   - **38a italic headers** — KHÔNG dùng italic cho heading.
   - **49 two-line clickable** — nav item, button, breadcrumb, footer link phải 1 dòng.
   - **51 overflow-wrap** — heading `overflow-wrap: anywhere; min-width: 0` cho label tiếng Việt dài.
   - **53 radio-tab scroll-jump** — không áp dụng cho sidebar accordion.

### 10.5 Locked fingerprint (dùng cho audit tự động)

```
Audience visual fingerprint:
- Paper: #F7F7F9 (page), #FFFFFF (surface), #FAFAFB (surface-alt)
- Ink: #1A1A1E primary, #6B7280 secondary
- Brand: #C8102E primary, #D4AF37 accent, #A50C24 hover
- Display + Body: Be Vietnam Pro (geometric-sans, single-font cho shell)
- Shape: radius-input 6px / radius-control 8px / radius-pill 999px
- Depth: shadow-control 0.08 + shadow-elevated 0.10 (nhẹ hơn --shadow-card)
- Focus: 3px ring brand-primary 18%
- Motion: motion-cut; 120ms hover; 200ms sidebar cubic-bezier(0.16, 1, 0.3, 1)
- Active: brand-primary-light bg + 3px left bar
- Footer: 1 row split (copyright | status dot + version)

Slop-test sentinel (mọi trang admin phải pass):
- KHÔNG dùng --radius-lg, --shadow-card, --shadow-modal
- KHÔNG dùng Source Serif 4
- KHÔNG dùng ivory/charcoal từ §9 Public
- KHÔNG dùng --hero-gradient
- KHÔNG dùng tag-left pattern (eyebrow trái, heading phải)
- KHÔNG transform: scale / translateY trên hover
- 0 italic trên heading
- Shell dùng font-family: var(--font-admin) mọi nơi
```
