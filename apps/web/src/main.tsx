import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "@/app/app.js";
import { initErrorReporting } from "@/lib/error-reporting.js";

initErrorReporting();

// After a deploy, a tab opened earlier still asks for the old page chunks, which no longer exist.
// Reload once to pick up the new build; the timestamp guard stops a reload loop if the chunk is really broken.
window.addEventListener("vite:preloadError", (event) => {
  const KEY = "sts_chunk_reload_at";
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(KEY) ?? 0);
  } catch {
    // storage blocked: fall through and reload once
  }
  if (Date.now() - last < 30_000) return;
  try {
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // ignore
  }
  event.preventDefault();
  window.location.reload();
});

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
