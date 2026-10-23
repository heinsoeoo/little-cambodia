import { watchGameUpdates } from "./pwa-updates.js";
export function createPwa({ onOpen = () => {}, onClose = () => {} } = {}) {
  const $ = (id) => document.getElementById(id),
    buttons = [...document.querySelectorAll("[data-install]")];
  let prompt = null;
  const installed = () =>
    matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  function refresh() {
    for (const button of buttons) {
      button.hidden = Boolean(installed());
    }
    $("pwa-offline").hidden = navigator.onLine;
  }
  addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    prompt = event;
  });
  addEventListener("appinstalled", () => {
    prompt = null;
    refresh();
  });
  for (const button of buttons)
    button.onclick = async () => {
      if (prompt) {
        const install = prompt;
        prompt = null;
        await install.prompt();
        await install.userChoice;
        return;
      }
      onOpen();
      $("install-help").hidden = false;
      $("install-instructions").textContent = /iPhone|iPad|iPod/.test(
        navigator.userAgent,
      )
        ? "In Safari, tap Share, then Add to Home Screen. Open the game from its new icon."
        : "Open your browser menu and choose Install app or Add to Home screen. Use Safari or Chrome outside Facebook’s browser.";
      $("install-help-close").focus();
    };
  function close() {
    $("install-help").hidden = true;
    onClose();
  }
  $("install-help-close").onclick = close;
  $("install-help").addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Tab") {
      e.preventDefault();
      $("install-help-close").focus();
    }
  });
  addEventListener("online", refresh);
  addEventListener("offline", refresh);
  refresh();
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        const updates = watchGameUpdates({
          registration,
          serviceWorker: navigator.serviceWorker,
          events: window,
          page: document,
          isOnline: () => navigator.onLine,
          onAvailable(available) {
            $("pwa-update").hidden = !available;
            $("update-notice").hidden = !available;
          },
          reload: () => location.reload(),
        });
        $("pwa-update").onclick = $("update-now").onclick = updates.apply;
        $("update-later").onclick = () => {
          $("update-notice").hidden = true;
        };
      })
      .catch(() => {});
  }
  return {
    get open() {
      return !$("install-help").hidden;
    },
  };
}
