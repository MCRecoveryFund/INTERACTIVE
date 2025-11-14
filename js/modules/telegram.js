/**
 * MC Recovery Fund - Telegram Integration
 * Telegram WebApp SDK integration
 */

export let tg = null;

export function initTelegram() {
  try {
    tg = window.Telegram?.WebApp;
    if (tg) {
      // Telegram Mini Apps initialization
      tg.ready();
      tg.expand();
      tg.enableClosingConfirmation();
      
      // Disable vertical swipes (для предотвращения закрытия при скролле)
      tg.disableVerticalSwipes();
      
      // Theme setup
      if (tg.colorScheme) {
        document.documentElement.setAttribute(
          "data-theme",
          tg.colorScheme === "dark" ? "dark" : "light"
        );
      }
      
      if (tg.themeParams) applyTelegramTheme(tg.themeParams);

      // React to theme changes
      tg.onEvent("themeChanged", () => {
        const scheme = tg.colorScheme === "dark" ? "dark" : "light";
        const r = document.documentElement;
        r.setAttribute("data-theme", scheme);
        if (tg.themeParams) applyTelegramTheme(tg.themeParams);
      });
      
      // Viewport changes (для адаптации к клавиатуре)
      tg.onEvent("viewportChanged", () => {
        // Viewport changed
      });
      
      // Back button (для навигации)
      tg.BackButton.onClick(() => {
        window.dispatchEvent(new CustomEvent('telegram-back'));
      });
      
      // Main button (изначально скрыт)
      tg.MainButton.setText("Продолжить");
      tg.MainButton.hide();
    }
  } catch (e) {
    // Running outside Telegram Mini App - silent fail
  }
  
  return tg;
}

function applyTelegramTheme(params) {
  const root = document.documentElement;
  if (params.button_color) {
    root.style.setProperty("--color-primary", params.button_color);
  }
  if (params.bg_color) root.style.setProperty("--tg-bg", params.bg_color);
  if (params.text_color) root.style.setProperty("--tg-text", params.text_color);
}

export function hapticFeedback(type = "light") {
  try {
    if (tg?.HapticFeedback) {
      if (type === "success" || type === "error") {
        tg.HapticFeedback.notificationOccurred(type);
      } else {
        tg.HapticFeedback.impactOccurred(type);
      }
    }
  } catch (e) {}
}

export function openLink(url) {
  hapticFeedback("light");
  if (url.includes("<ADD_")) {
    alert("Эта функция скоро будет доступна");
    return;
  }
  if (tg) {
    tg.openLink(url);
  } else {
    window.open(url, "_blank");
  }
}
