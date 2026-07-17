import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import { AppProviders } from "./app/providers/AppProviders";
import "./styles/reset.css";
import "./styles/tokens.css";

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
