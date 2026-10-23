// Check on app resume without replacing a running game until the player agrees.
export function watchGameUpdates({
  registration,
  serviceWorker,
  events,
  page,
  onAvailable,
  reload,
  now = Date.now,
  isOnline = () => true,
}) {
  let originalController = serviceWorker.controller;
  let checking = false,
    lastCheck = -Infinity,
    accepted = false,
    reloaded = false;
  let available = false;
  const changedController = () =>
    Boolean(
      originalController && serviceWorker.controller !== originalController,
    );
  function show() {
    const next = Boolean(registration.waiting || changedController());
    if (next !== available) {
      available = next;
      onAvailable(next);
    }
  }
  function watchInstalling() {
    registration.installing?.addEventListener("statechange", () =>
      queueMicrotask(show),
    );
    show();
  }
  async function check() {
    if (page.hidden || !isOnline() || checking || now() - lastCheck < 10000)
      return;
    lastCheck = now();
    checking = true;
    try {
      await registration.update();
    } catch {
      /* Offline resumes retry next time. */
    } finally {
      checking = false;
      show();
    }
  }
  function changed() {
    if (!originalController) {
      originalController = serviceWorker.controller;
      show();
      return;
    }
    if (accepted && changedController() && !reloaded) {
      reloaded = true;
      reload();
    } else show();
  }
  registration.addEventListener("updatefound", watchInstalling);
  serviceWorker.addEventListener("controllerchange", changed);
  page.addEventListener("visibilitychange", check);
  for (const name of ["pageshow", "focus", "online"])
    events.addEventListener(name, check);
  watchInstalling();
  check();
  return {
    apply() {
      if (accepted) return;
      if (changedController()) {
        accepted = true;
        reloaded = true;
        reload();
      } else if (registration.waiting) {
        accepted = true;
        registration.waiting.postMessage({ type: "ACTIVATE_UPDATE" });
      }
    },
    check,
  };
}
