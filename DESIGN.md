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
