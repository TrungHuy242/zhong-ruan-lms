import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import { AppProviders } from "./app/providers/AppProviders";
import "./styles/reset.css";
import "./styles/tokens.css";

// Self-host fonts with Vietnamese subset.
// Google Fonts URL KHÔNG serve Vietnamese subset theo mặc định — khiến
// browser fallback font hệ thống và decompose các ký tự ế/ố/ầ/ắ/ẫ thành
// "e + combining acute accent" → lỗi tách dấu.
// @fontsource cung cấp các subset riêng (vietnamese-*.css) với unicode-range
// chính xác cho glyph Tiếng Việt, fix triệt để vấn đề này.

// Inter
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/vietnamese-400.css";
import "@fontsource/inter/vietnamese-500.css";
import "@fontsource/inter/vietnamese-600.css";
import "@fontsource/inter/vietnamese-700.css";

// Be Vietnam Pro
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/be-vietnam-pro/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/vietnamese-500.css";
import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/be-vietnam-pro/vietnamese-700.css";

// Source Serif 4 (editorial serif cho headings)
import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/600.css";
import "@fontsource/source-serif-4/700.css";
import "@fontsource/source-serif-4/400-italic.css";
import "@fontsource/source-serif-4/vietnamese-400.css";
import "@fontsource/source-serif-4/vietnamese-600.css";
import "@fontsource/source-serif-4/vietnamese-700.css";
import "@fontsource/source-serif-4/vietnamese-400-italic.css";

// HelmetProvider bọc NGOÀI BrowserRouter + AppProviders để:
//   - Hoạt động với cả prerender (puppeteer lấy page.content() sau khi helmet apply)
//   - Không bị re-mount khi navigate (context persist xuyên suốt app).
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AppProviders>
          <App />
        </AppProviders>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
