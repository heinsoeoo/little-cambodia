export function isFacebookBrowser(userAgent = "") {
  return /FBAN[\/:]|FBAV[\/:]|FB_IAB|FB4A|FBIOS/i.test(userAgent);
}
export function createBrowserNotice({
  onContinue = () => {},
  userAgent = navigator.userAgent,
} = {}) {
  const overlay = document.getElementById("browser-notice"),
    copy = document.getElementById("browser-copy"),
    link = document.getElementById("browser-link"),
    status = document.getElementById("browser-copy-status");
  const key = "little-cambodia-browser-tip";
  let seen = false;
  try {
    seen = sessionStorage.getItem(key) === "1";
  } catch {}
  const visible = isFacebookBrowser(userAgent) && !seen;
  overlay.hidden = !visible;
  if (visible) {
    document.getElementById("browser-continue").focus();
  }
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(link.value);
      status.textContent = "Link copied. Paste it into Safari or Chrome.";
    } catch {
      link.hidden = false;
      link.focus();
      link.select();
      status.textContent =
        "Press and hold the link to copy it, then paste it into Safari or Chrome.";
    }
  };
  document.getElementById("browser-continue").onclick = () => {
    overlay.hidden = true;
    try {
      sessionStorage.setItem(key, "1");
    } catch {}
    onContinue();
  };
  overlay.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const controls = [...overlay.querySelectorAll("button,input")].filter(
      (e) => !e.hidden,
    );
    const index = controls.indexOf(document.activeElement);
    event.preventDefault();
    controls[
      (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length
    ]?.focus();
  });
  return { visible };
}
export function needsBrowserNotice(userAgent, storage) {
  let seen = false;
  try {
    seen = storage.getItem("little-cambodia-browser-tip") === "1";
  } catch {}
  return isFacebookBrowser(userAgent) && !seen;
}
