/**
 * MC Recovery Fund - Theme Module
 * Theme switching and management
 */

import { hapticFeedback, tg } from './telegram.js';

export function toggleTheme() {
  const root = document.documentElement;
  const current = root.getAttribute("data-theme") || "light";
  const next = current === "light" ? "dark" : "light";

  root.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  root.style.removeProperty("--color-text");
  root.style.removeProperty("--color-bg");

  const sunIcon = document.querySelector(".theme-icon-sun");
  const moonIcon = document.querySelector(".theme-icon-moon");

  if (next === "dark") {
    if (sunIcon) sunIcon.style.display = "none";
    if (moonIcon) moonIcon.style.display = "block";
  } else {
    if (sunIcon) sunIcon.style.display = "block";
    if (moonIcon) moonIcon.style.display = "none";
  }

  if (tg && tg.themeParams) {
    if (next === "dark") {
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", "#0a0f1a");
    } else {
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", "#1326FD");
    }
  }

  hapticFeedback("light");
}

export function initThemeIcons() {
  const theme = document.documentElement.getAttribute("data-theme") || "light";
  const sunIcon = document.querySelector(".theme-icon-sun");
  const moonIcon = document.querySelector(".theme-icon-moon");

  if (theme === "dark") {
    if (sunIcon) sunIcon.style.display = "none";
    if (moonIcon) moonIcon.style.display = "block";
  } else {
    if (sunIcon) sunIcon.style.display = "block";
    if (moonIcon) moonIcon.style.display = "none";
  }
}
