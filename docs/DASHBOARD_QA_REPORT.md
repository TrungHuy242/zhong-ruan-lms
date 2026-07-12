# BÁO CÁO REVIEW MODULE DASHBOARD

**Vai trò:** Senior QA Engineer + Senior Performance Engineer
**Phạm vi:**
- `backend/src/modules/dashboard/` (3 files: routes, controller, service)
- `frontend/src/features/dashboard/` (15 files: pages, components, hooks, services)

**Quy ước mức độ:**
- **P0** — Critical: crash, data corruption, security breach, blocker production.
- **P1** — High: bug rõ ràng ảnh hưởng UX/đúng-sai, cần fix sớm.
- **P2** — Medium: edge case / tối ưu performance / UX nhỏ.
- **P3** — Low: code smell, cải tiến thẩm mỹ.

---

## 1. Tổng quan kiến trúc

| Layer | Công nghệ | Đánh giá nhanh |
|---|---|---|
| BE route | Express + Prisma + raw SQL cho monthly | Tốt, có dùng `Promise.all`, có role guard |
| BE service | `count()` 7 query song song cho overview, `GROUP BY date_trunc` cho monthly | Ổn, nhưng `auditLog.count()` nguy hiểm ở scale lớn |
| FE state | 4 state riêng (`overview`/`monthly` + loading/error) | Tốt — lỗi 1 widget không sập cả |
| FE auto-refresh | `useAutoRefresh` (interval + visibility pause) | Đúng pattern, đã cleanup |
| FE persistence | `useDashboardWidgets` + localStorage | An toàn, có merge với default |
| FE chart | Recharts AreaChart | OK |
| FE export | html2canvas → PNG | OK |

---

## 2. FUNCTIONAL TEST

| # | Test case | Trạng thái | Ghi chú |
|---|---|---|---|
| F1 | Dashboard Overview load với role Admin | ✅ PASS | Auth + role middleware đúng |
| F2 | Dashboard Overview với role Teacher/Student | ✅ PASS | 403 từ `authorizeRoles("ADMIN")` |
| F3 | Monthly Statistics default `months=6` | ✅ PASS | Controller fallback `parsed=6` khi missing |
| F4 | Monthly Statistics custom `months=12` | ✅ PASS | Service clamp `[1,12]` |
| F5 | Monthly Statistics invalid `months=abc` | ✅ PASS | Service fallback về 6 |
| F6 | Monthly Statistics `months=999` | ✅ PASS | Clamp về 12 |
| F7 | Recent Activities hiển thị 10 dòng mới nhất | ⚠️ **BUG** | Xem lỗi F-RC-01 — bị clamp pageSize=100 có thể miss data |
| F8 | Quick Actions — Thêm User mở modal | ✅ PASS | |
| F9 | Quick Actions — Tạo Notification mở modal | ✅ PASS | |
| F10 | Quick Actions — Upload File mở overlay | ✅ PASS | |
| F11 | Quick Actions — Cài đặt → navigate `/settings` | ✅ PASS | |
| F12 | Quick Actions callback `onChanged` → refresh data | ✅ PASS | `handleChanged` gọi `loadAll({silent:false})` |
| F13 | Widget Settings bật/tắt từng widget | ✅ PASS | Có merge default + persist |
| F14 | Widget Settings reset về mặc định | ✅ PASS | |
| F15 | Widget bật lại sau khi ẩn → fetch lại | ✅ PASS | `prevEnabledRef` logic đúng |
| F16 | Auto refresh mỗi 60s | ✅ PASS | `useAutoRefresh` + visibility pause |
| F17 | Auto refresh pause khi tab ẩn | ✅ PASS | `visibilitychange` listener + cleanup |
| F18 | Manual refresh qua nút | ✅ PASS | Có loading state + banner |
| F19 | Export PNG qua html2canvas | ✅ PASS | Ẩn nút điều khiển rồi khôi phục |
| F20 | Chart switcher (users/files/notifications) | ✅ PASS | Có `role="tab"` + `aria-selected` |
| F21 | KPI Card count-up animation | ✅ PASS | `useCountUp` dùng `requestAnimationFrame` + cleanup |
| F22 | KPI Card trend % so với kỳ trước | ⚠️ **Cảnh báo** | Công thức proxy sai về mặt nghiệp vụ (xem F-PERF-04) |
| F23 | Recent Activities click row → modal detail | ✅ PASS | Re-use `AuditLogDetailModal` |
| F24 | Dashboard với user bị SUSPENDED | ✅ PASS | `auth.middleware` chặn `status !== ACTIVE` |
| F25 | Logout từ Dashboard | N/A | Dashboard không có nút logout (thuộc header global) |

---

## 3. DANH SÁCH LỖI CHI TIẾT

### 🔴 P0 — Critical

#### P0-01: RecentActivities bị âm thầm miss data khi audit log lớn
- **File:** `frontend/src/features/dashboard/components/RecentActivities.tsx` (line 93), `backend/src/modules/audit/audit.service.js` (line 158)
- **Nguyên nhân:** FE gọi `listAuditLogs({ pageSize: 200 })` để lấy 10 dòng mới nhất. BE clamp `pageSize` về tối đa **100**. Nếu `audit_logs` có >100 rows và 10 dòng "gần đây" thật sự nằm ngoài top-100 → `slice(0, 10)` chỉ thấy 10/100 dòng cũ hơn. Hoặc tệ hơn, nếu page-1 trả về 100 record nhưng 10 record mới nhất lại ở page-2 → Dashboard hiển thị nhầm "hoạt động" cũ.
- **Cách tái hiện:**
  1. Insert 150 audit log giả, trong đó 5 record mới nhất có `createdAt` > 100 record đầu tiên.
  2. Vào Dashboard → RecentActivities.
  3. Không thấy 5 record mới nhất.
- **Mức độ:** P0 (silent data incorrect)
- **Đề xuất sửa:**
  - **Tốt nhất:** thêm endpoint mới `GET /api/admin/audit-logs/recent?limit=10` ở BE trả về đúng N record mới nhất (query `ORDER BY createdAt DESC LIMIT N`), không cần pageSize.
  - **Tạm thời:** tăng cap `pageSize` lên ≥200 ở BE, hoặc đổi FE gọi đúng cap hiện tại là 100 và thêm comment "vẫn có thể miss nếu DB rất lớn".

---

### 🟠 P1 — High

#### P1-01: Recent Activities fetch O(N) data khi chỉ cần N=10
- **File:** `frontend/src/features/dashboard/components/RecentActivities.tsx` (line 93), `backend/src/modules/audit/audit.service.js` (line 158)
- **Nguyên nhân:** Widget chỉ hiển thị 10 dòng nhưng kéo về tối đa 200 rows từ server, sort lại phía client, slice 10. Lãng phí bandwidth + memory + CPU cả 2 phía. Nếu tăng pageSize cap lên 1000 thì càng tệ.
- **Cách tái hiện:** Mở DevTools → Network → quan sát response size của `/api/admin/audit-logs?pageSize=200` (≈50–200 KB tuỳ DB) cho 1 widget hiển thị 10 dòng.
- **Mức độ:** P1 (performance, scale)
- **Đề xuất sửa:** Thêm endpoint BE `GET /api/admin/audit-logs/recent?limit=10`. FE chỉ render trực tiếp `items` từ response, không sort/slice.

#### P1-02: Auto refresh + Manual refresh có thể trigger 2 request đồng thời → race condition set state
- **File:** `frontend/src/features/dashboard/pages/DashboardPage.tsx` (line 227–240, 264–268)
- **Nguyên nhân:** `useAutoRefresh` gọi `loadAll({ silent: true })` mỗi 60s. Nếu user vừa bấm Manual Refresh (cũng gọi `loadAll`), 2 promise chạy đồng thời. Khi response về, `setOverview(data)` có thể ghi đè bằng data cũ (response manual về sau response auto-refresh) → UI hiển thị giá trị cũ. Không có "request token" / AbortController để loại bỏ stale response.
- **Cách tái hiện:**
  1. Mạng chậm → click Manual Refresh.
  2. Đúng lúc auto-refresh tick → 2 request bay cùng lúc.
  3. Response auto-refresh về sau → `setOverview(data_old)` dù manual đã ghi data mới.
- **Mức độ:** P1 (UX inconsistency)
- **Đề xuất sửa:** Thêm `requestSeq` counter trong state. Trước khi `setOverview`, check `if (seq === currentSeq) setData(data)` để drop stale response. Hoặc dùng `AbortController` để huỷ request cũ khi có request mới.

#### P1-03: Widget toggle gây re-fetch không kiểm soát — spam toggle có thể khoá DB pool
- **File:** `frontend/src/features/dashboard/pages/DashboardPage.tsx` (line 251–261)
- **Nguyên nhân:** Mỗi lần widget `kpi`/`charts` chuyển từ off→on, gọi ngay `loadMonthly(false)` / `loadOverview(false)`. Nếu user spam toggle 10 lần/giây sẽ sinh 10 request song song. Cũng không có cơ chế ngăn gọi khi data đã fresh (cache TTL).
- **Cách tái hiện:** Mở Widget Settings popover → spam tick/bỏ tick "Biểu đồ thống kê" liên tục → DevTools Network thấy hàng loạt `/dashboard/stats/monthly`.
- **Mức độ:** P1 (DoS phía client dội lên BE)
- **Đề xuất sửa:** Debounce 300ms, hoặc chỉ fetch khi widget vừa được bật (transition `false→true`) chứ không fetch cả khi tắt. Hiện code đã check `!prev.charts && widgets.enabled.charts` đúng — chỉ cần thêm skip khi request đang in-flight.

#### P1-04: `auditLog.count()` không bounded — có thể OOM/lock DB ở production
- **File:** `backend/src/modules/dashboard/dashboard.service.js` (line 34)
- **Nguyên nhân:** `prisma.auditLog.count()` không có `where`/partition, chạy `SELECT COUNT(*) FROM audit_logs`. Khi bảng đạt vài triệu record, query sẽ lock page hoặc trigger autovacuum storm. Hơn nữa kết hợp với auto-refresh 60s và N admin mở cùng lúc → N query COUNT full-table mỗi phút.
- **Cách tái hiện:** Seed 5 triệu audit log → quan sát `pg_stat_activity` thấy query `count(*)` chạy lâu >5s.
- **Mức độ:** P1 (production blocker khi scale)
- **Đề xuất sửa:**
  - Cache overview trong Redis với TTL 60s, key `dashboard:overview`.
  - Hoặc thay `count()` bằng estimate từ `pg_stat_user_tables.n_live_tup` (approximate, O(1)).
  - Tách `auditLogs` ra khỏi overview critical path — đưa sang endpoint riêng (audit-logs đã có).

#### P1-05: `useAutoRefresh` lấy callback từ ref nhưng KHÔNG re-create khi dependency đổi → stale closure của widget state
- **File:** `frontend/src/shared/hooks/useAutoRefresh.ts` (line 36–37, 46–48), `frontend/src/features/dashboard/pages/DashboardPage.tsx` (line 264)
- **Nguyên nhân:** `callbackRef.current = callback` được gán mỗi render — đúng. **NHƯNG** callback thực tế là `() => loadAll({ silent: true })`, mà `loadAll` được tạo qua `useCallback([loadOverview, loadMonthly, widgets])`. `widgets` đổi reference mỗi lần toggle → `loadAll` reference đổi → parent re-render → callback prop đổi → `callbackRef.current` cập nhật. Hợp lý. **Tuy nhiên**: nếu user vừa toggle 1 widget đang ẩn, `loadAll` không push task cho widget đó (đúng), nhưng `setLastUpdated(new Date())` vẫn chạy → user thấy "Cập nhật lần cuối" nhảy dù không có data mới. Re-render không cần thiết.
- **Cách tái hiện:** Ẩn widget KPI → quan sát timestamp "Cập nhật lần cuối" vẫn nhảy mỗi 60s dù không có gì cập nhật.
- **Mức độ:** P1 (UX misleading + minor perf)
- **Đề xuất sửa:** Chỉ `setLastUpdated` khi `tasks.length > 0`.

---

### 🟡 P2 — Medium

#### P2-01: `localStorage` write không có quota handling
- **File:** `frontend/src/features/dashboard/hooks/useDashboardWidgets.ts` (line 91–97)
- **Nguyên nhân:** Đã có try/catch cho `setItem`, OK. Nhưng nếu localStorage đầy (5MB) hoặc disabled (private mode iOS Safari), user toggle widget sẽ im lặng không persist. Không có UX feedback.
- **Mức độ:** P2 (UX)
- **Đề xuất sửa:** Khi catch, show toast "Không thể lưu tuỳ chỉnh (storage đầy)". Hiện đang silent fail.

#### P2-02: `pickValue` dùng string switch thay vì object lookup → khó mở rộng
- **File:** `frontend/src/features/dashboard/pages/DashboardPage.tsx` (line 122–137)
- **Nguyên nhân:** Mỗi lần thêm chỉ số mới phải sửa cả `OverviewSource` type + `pickValue` switch. Object lookup `(overview as any)[source]` (hoặc nested) gọn hơn.
- **Mức độ:** P2 (maintainability)
- **Đề xuất sửa:** Định nghĩa `Record<OverviewSource, (overview) => number>`.

#### P2-03: KPI Card trend % dùng công thức "proxy" sai về nghiệp vụ
- **File:** `frontend/src/features/dashboard/pages/DashboardPage.tsx` (line 145–154), `frontend/src/features/dashboard/components/KpiCard.tsx` (line 77)
- **Nguyên nhân:** Công thức hiện tại: `previousValue = current_total - monthly_last_month` rồi tính `(current - previous) / previous * 100`. Đây là "phần trăm thay đổi giữa TỔNG-LŨY-KẾ và TỔNG-TRƯỚC-THÁNG-GẦN-NHẤT", không phải "% thay đổi so với kỳ trước". Về mặt ngữ nghĩa nó là số tăng tuyệt đối, không phải tỉ lệ tăng. Ví dụ: tổng = 100, tháng này = 20 → "kỳ trước" = 80 → +25%. Người dùng nghĩ là "tăng 25% so với tháng trước" (sai: đúng ra phải là 20 so với 1 tháng trước, không có ý nghĩa gì).
- **Cách tái hiện:** Xem KPI "Tổng Users" → mũi tên % hiển thị sai logic.
- **Mức độ:** P2 (logic misleading, không phải crash)
- **Đề xuất sửa:** BE nên trả thêm `previousTotal` (total tính đến cuối tháng trước tháng hiện tại) trong `getOverview`. FE dùng `(current - previousTotal) / previousTotal * 100`. Hoặc đổi label thành "% đã đạt được trong tháng gần nhất" cho đúng nghĩa.

#### P2-04: `useEffect` đầu tiên dùng `eslint-disable-next-line` — đã comment nhưng dễ re-introduce bug
- **File:** `frontend/src/features/dashboard/pages/DashboardPage.tsx` (line 244–247)
- **Nguyên nhân:** `useEffect(() => { loadAll(...) }, [])` chỉ chạy 1 lần. Nếu sau này ai đó xoá comment để satisfy exhaustive-deps, sẽ trigger load vô hạn khi `loadAll` đổi reference.
- **Mức độ:** P2 (code smell, future bug risk)
- **Đề xuất sửa:** Thêm comment chi tiết hơn tại sao `[]` là intentional. Hoặc dùng `useRef(true)` pattern.

#### P2-05: `recent activities` không auto-refresh theo interval
- **File:** `frontend/src/features/dashboard/components/RecentActivities.tsx` (line 114–117)
- **Nguyên nhân:** Chỉ load 1 lần lúc mount. Khi Dashboard auto-refresh mỗi 60s, overview + monthly được cập nhật nhưng recent activities thì KHÔNG → UI inconsistent. Có thể hiểu "Recent Activities" là snapshot ban đầu, nhưng behavior lệch giữa 2 widget gây confuse.
- **Cách tái hiện:** Click Manual Refresh → thấy KPI + chart update, recent activities giữ nguyên.
- **Mức độ:** P2 (UX inconsistency)
- **Đề xuất sửa:** Hook RecentActivities vào auto-refresh cycle. Hoặc thêm nút refresh riêng trong widget.

#### P2-06: `html2canvas` không có timeout / progress
- **File:** `frontend/src/features/dashboard/pages/DashboardPage.tsx` (line 307–355)
- **Nguyên nhân:** Với dashboard lớn (nhiều widget, chart phức tạp), `html2canvas` có thể treo 5–10s. UI chỉ hiện spinner chung "Đang xuất..." nhưng không có progress bar. User có thể tưởng app crash và bấm F5.
- **Mức độ:** P2 (UX)
- **Đề xuất sửa:** Thêm progress event của html2canvas (`oncloned` + custom hook) hoặc disable button với timer cảnh báo >5s.

#### P2-07: Chart switcher state (`chartSeries`) bị reset khi widget ẩn→hiện
- **File:** `frontend/src/features/dashboard/pages/DashboardPage.tsx` (line 184–186)
- **Nguyên nhân:** State `chartSeries` nằm ở page-level. Khi widget `charts` bị ẩn, MonthlyChart unmount. Khi bật lại, MonthlyChart mount lại với state vẫn còn → OK. **NHƯNG** nếu page remount (navigate away + back), state mất → reset về `"users"`. Có thể acceptable, nhưng có thể persist vào localStorage để UX tốt hơn.
- **Mức độ:** P3 thực ra (low)
- **Đề xuất sửa:** Persist `chartSeries` cùng với widget settings.

#### P2-08: KPI Card `numberFormatter` tạo mới mỗi render
- **File:** `frontend/src/features/dashboard/components/KpiCard.tsx` (line 66)
- **Nguyên nhân:** `const numberFormatter = new Intl.NumberFormat("vi-VN");` tạo mới mỗi render. Trên dashboard có 6 card × auto-refresh mỗi 60s → 6 formatter/giây/phút × N admin. Nhỏ nhưng tích luỹ.
- **Mức độ:** P3 (micro-perf)
- **Đề xuất sửa:** Module-level `const VN_FORMATTER = new Intl.NumberFormat("vi-VN")`.

#### P2-09: Không có test cho `dashboard.service.js` (raw SQL)
- **File:** `backend/src/modules/dashboard/dashboard.service.js` (toàn bộ)
- **Nguyên nhân:** Raw SQL với `date_trunc` + `interval` không có unit test. Nếu timezone của server đổi (UTC → Asia/Ho_Chi_Minh), query có thể trả sai tháng. Hiện code dùng `getUTCFullYear/getUTCMonth` để build `monthList` — nhưng raw SQL dùng `NOW()` của DB server → có thể lệch ngày cutoff nếu BE chạy UTC còn DB chạy local time.
- **Cách tái hiện:** Set DB timezone sang `Asia/Ho_Chi_Minh`, quan sát tháng hiện tại trên chart lệch 1 đơn vị so với local.
- **Mức độ:** P2 (correctness ở scale/edge timezone)
- **Đề xuất sửa:** Force DB session timezone = UTC khi query: `SET TIME ZONE 'UTC'` trước khi `SELECT`. Hoặc truyền `now` từ app làm parameter: `WHERE createdAt >= $fromDate`.

#### P2-10: `parseInt` không an toàn trong query string `months`
- **File:** `backend/src/modules/dashboard/dashboard.controller.js` (line 57–60)
- **Nguyên nhân:** `Number(req.query.months)` → nếu truyền `months=12abc` → `NaN`. Service có fallback `6` (OK). Nhưng nếu truyền `months=1e10` → `10000000000` → service clamp về 12 (OK). Đã handle đúng. **Vấn đề thật:** nếu truyền `months=Infinity` → `Number(...) = Infinity` → `Math.floor(Infinity) = Infinity` → `Math.min(12, Infinity) = 12` → OK. Edge case đã cover. Không có bug thực — note này để confirm.
- **Mức độ:** N/A (không có bug)

---

### 🔵 P3 — Low

#### P3-01: Comment tiếng Việt trong dashboard.service.js — dễ bị strip khi build/minify (OK vì JS) nhưng convention dễ lệch chuẩn team
- **File:** `backend/src/modules/dashboard/dashboard.service.js` (header)
- **Mức độ:** P3
- **Đề xuất sửa:** Cân nhắc giữ comment ngắn bằng tiếng Anh trong core service, tiếng Việt ở route/controller.

#### P3-02: `formatMonth` không handle timezone
- **File:** `frontend/src/features/dashboard/components/MonthlyChart.tsx` (line 61–64)
- **Nguyên nhân:** Chỉ slice string, không có bug. Nhưng nếu BE trả `"2026-07"` thì format `"07/2026"` đúng. Không có issue.
- **Mức độ:** N/A (chỉ là comment)

#### P3-03: `DashboardPage.tsx` quá lớn (535 dòng) — nên tách custom hook
- **File:** `frontend/src/features/dashboard/pages/DashboardPage.tsx` (toàn bộ)
- **Nguyên nhân:** Logic load data + render + export + auto-refresh + widget toggle đều nằm trong 1 file.
- **Mức độ:** P3 (maintainability)
- **Đề xuất sửa:** Tách `useDashboardData()` hook chứa state + load functions + auto-refresh integration, page chỉ render.

#### P3-04: Không có E2E test (Playwright/Cypress) cho flow export
- **File:** N/A (toàn project)
- **Mức độ:** P3
- **Đề xuất sửa:** Thêm smoke test: load dashboard → click Export → verify PNG downloaded.

---

## 4. EDGE CASES

| Edge case | BE | FE | Đánh giá |
|---|---|---|---|
| Không có dữ liệu (DB rỗng) | `count()` trả 0, monthly trả mảng `[0,0,...]` | `empty={!monthlyLoading && !monthly && !monthlyError}` → hiện "Chưa có dữ liệu" | ✅ OK |
| Dữ liệu rất lớn (>1M row) | `count()` chậm, monthly OK nhờ index | Pagination OK ở overview | ⚠️ P1-04 |
| API timeout | BE không set timeout → request treo vô hạn | `apiFetch` không có AbortController → component loading forever | 🔴 Thiếu: cần timeout + AbortController |
| API trả 500 | Controller catch → return 500 | `setError(message)` → hiển thị Alert + nút "Thử lại" | ✅ OK |
| API trả 401 (token expired) | auth.middleware → 401 | `apiFetch` throw ApiError, không auto-redirect login | ⚠️ P3: thiếu global handler |
| Widget 1 lỗi, widget 2 OK | Không liên quan | State loading/error riêng từng widget → lỗi 1 widget không sập 2 | ✅ OK (pattern tốt) |
| Mất mạng giữa chừng (giữa auto-refresh) | Không liên quan | `setOverviewError` set → Alert hiện | ✅ OK nhưng cần retry logic tự động |
| BE response siêu chậm (>30s) | Treo connection | Loading state indefinite, không có timeout | 🔴 Thiếu |

---

## 5. PERFORMANCE

| Concern | Phân tích | Mức độ |
|---|---|---|
| Duplicate API request | Có thể xảy ra ở widget toggle spam (P1-03) và auto+manual overlap (P1-02) | P1 |
| N+1 Query | Không — service dùng `count()` + raw `GROUP BY` | ✅ |
| Slow Query | `count()` trên bảng lớn (P1-04) | P1 |
| Pagination | OK ở BE; FE `RecentActivities` tự ý kéo 200 rows (P1-01) | P1 |
| Memory Leak (FE) | `useAutoRefresh` cleanup đúng; `useCountUp` cleanup đúng; html2canvas `revokeObjectURL` đúng | ✅ |
| Memory Leak (BE) | Promise.all không có vấn đề, raw SQL không cache → OK | ✅ |
| Re-render không cần thiết | `chartSeries` state không thay đổi nhưng trigger re-render `MonthlyChart` (Recharts heavy) | P2 — đã memo `monthlyData` |
| Interval Leak | `useAutoRefresh` clear interval trong cleanup | ✅ |
| API gọi dư | RecentActivities (P1-01), widget toggle spam (P1-03), `auditLog.count` mỗi 60s × N admin (P1-04) | P1 |
| Race Condition | Auto-refresh + manual (P1-02); toggle widget + auto-refresh | P1 |
| Bundle size | html2canvas + recharts đều nặng — chưa thấy lazy load page Dashboard | P3 |
| WebSocket | Không dùng cho Dashboard auto-refresh → polling 60s OK, nhưng scale 100 admin = 100 req/60s | P2: cân nhắc chuyển sang SSE/WebSocket khi scale |

---

## 6. CONCURRENCY

| Scenario | Phân tích |
|---|---|
| Spam Refresh button | Có `isManualRefreshing` state chặn click → ✅ |
| Auto Refresh + Manual Refresh | P1-02: không có AbortController, response stale có thể ghi đè data mới |
| Nhiều Admin mở Dashboard cùng lúc | BE phục vụ đồng thời OK; P1-04 (count audit_logs) sẽ là bottleneck khi N>10 |
| Widget bật/tắt liên tục | P1-03: thiếu debounce, spam request |
| 2 Admin tạo User cùng lúc | Không liên quan Dashboard (xử lý ở User module) |
| Background tab → tab visible | `visibilitychange` resume interval → OK nhưng fire NGAY (không delay) có thể spam 1 lần nếu nhiều tab mở | P3 |

---

## 7. SECURITY

| Concern | Đánh giá |
|---|---|
| Phân quyền route | ✅ Cả 2 endpoint đều `authenticate + authorizeRoles("ADMIN")` |
| Phân quyền service | OK — service chỉ `count()` không phân biệt user |
| Lộ dữ liệu | ✅ Overview chỉ trả `total` + `byRole` — không lộ email/hash |
| Audit log fetch | `listAuditLogs` đã có redaction `meta` (password/refreshToken) ở audit.service | ✅ |
| SQL injection | `dashboard.service.js` dùng `Prisma.sql` template với `Prisma.raw` cho table name đã hard-code (không user input) | ✅ |
| XSS | FE render `log.action` qua `AUDIT_ACTION_LABELS[key]` lookup + fallback `log.action` raw. Nếu 1 row có action literal `<script>` không thuộc map → render raw text (không nguy hiểm vì React escape). | ✅ |
| CORS | App dùng `cors()` mặc định (allow all) — OK cho dev, cần restrict ở prod | P3 |
| Rate limit | Không áp cho `/api/dashboard/*` — admin endpoint nhưng nếu token admin leak, attacker có thể spam count query → DB DoS | P2: cần rate-limit riêng |
| CSRF | FE dùng Bearer token (không cookie) → không có CSRF | ✅ |
| Token expiry | auth.middleware verify → 401 → FE nhận error. **NHƯNG** không có auto-refresh logic trong `apiFetch` — user bị đá về login | P2 (UX gap) |

---

## 8. CHẤM ĐIỂM

| Tiêu chí | Điểm (/10) | Nhận xét |
|---|---|---|
| **Functional** | 8.5 | Đầy đủ tính năng, có error/empty state, manual+auto refresh, export PNG. Trừ 1.5 vì RecentActivities có bug miss data tiềm tàng (P0-01) và trend % sai logic (P2-03). |
| **Performance** | 6.5 | Code có memo + Promise.all + visibility pause tốt. Trừ vì: RecentActivities over-fetch (P1-01), audit count full-table (P1-04), race condition auto+manual (P1-02), widget toggle spam (P1-03). |
| **Security** | 8.0 | Auth + role guard đúng. Không có SQLi/XSS/CSRF. Trừ vì: rate-limit cho admin endpoint thiếu, CORS mặc định, thiếu timeout/AbortController có thể dẫn đến DoS pattern. |
| **Scalability** | 5.5 | OK ở 1–5 admin đồng thời. Vài chục admin + DB lớn (1M+ audit logs) sẽ gặp bottleneck ở `count(*)`. Cần cache layer + endpoint chuyên dụng `/recent`. |
| **Production Readiness** | 6.0 | Có thể lên prod với scale nhỏ (<10 admin, <100K records). **KHÔNG** sẵn sàng ở scale lớn. Thiếu: timeout, AbortController, rate-limit, cache, tests, monitoring/observability. |

### Điểm tổng hợp (có trọng số)

```
Functional       × 0.20 = 1.70
Performance      × 0.25 = 1.625
Security         × 0.20 = 1.60
Scalability      × 0.15 = 0.825
Prod Readiness   × 0.20 = 1.20
                 ───────
TỔNG:                    6.95 / 10
```

---

## 9. TOP 5 ƯU TIÊN SỬA CHỮA

1. **🔴 P0-01** — Sửa RecentActivities bị miss data (cap pageSize + thiếu endpoint chuyên dụng).
2. **🔴 Thiếu timeout/AbortController** — Thêm `AbortController` + `setTimeout(30s)` cho `apiFetch`.
3. **🟠 P1-04** — Tách `auditLogs.total` khỏi overview critical path hoặc cache.
4. **🟠 P1-02** — Stale response handling cho auto+manual refresh overlap.
5. **🟠 P1-01 + P1-03** — Endpoint `/recent` + debounce widget toggle.

---

## 10. KẾT LUẬN

Module Dashboard có **kiến trúc FE tốt** (state tách biệt, memo, cleanup, visibility pause) và **BE service gọn** (Promise.all, raw SQL có index). Tuy nhiên còn **1 bug critical ảnh hưởng correctness** (P0-01) và **nhiều gap production** (timeout, race, cache, scale). Ở scale hiện tại (1–5 admin, <100K records), dashboard hoạt động ổn định. Scale lên vài chục admin + vài triệu audit log → cần refactor theo ưu tiên trên.

**Khuyến nghị:** KHÔNG nên ship lên môi trường production nhiều admin trước khi fix P0-01 và P1-04.