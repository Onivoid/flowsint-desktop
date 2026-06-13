import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./i18n";
import "./index.css";

// Apply dark theme by default before first render to avoid flash
const stored = localStorage.getItem("theme");
if (!stored || stored === '"system"') {
  document.documentElement.classList.add("dark");
} else if (stored === '"dark"') {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.add("light");
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
