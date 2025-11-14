/**
 * MC Recovery Fund - Theme Initialization
 * Executes before page load to prevent theme flash
 */

(function () {
  try {
    var tg = window.Telegram && window.Telegram.WebApp;
    var saved = localStorage.getItem("theme");
    var fromTG = tg && tg.colorScheme; // 'dark' | 'light'
    var theme =
      fromTG ||
      saved ||
      (window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    document.documentElement.setAttribute("data-theme", theme);

    // Telegram Mini Apps optimization
    if (tg) {
      // Prevent loading delay
      tg.ready();
      // Set loading progress
      if (tg.isVersionAtLeast && tg.isVersionAtLeast("6.1")) {
        tg.setHeaderColor("secondary_bg_color");
      }
    }
  } catch (e) {
    // Silent theme init error
  }
})();
