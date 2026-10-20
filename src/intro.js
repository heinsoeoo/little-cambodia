export function createIntro({ onOpen = () => {}, onClose = () => {} } = {}) {
  const overlay = document.getElementById("intro"),
    button = document.getElementById("intro-skip"),
    cards = [...overlay.querySelectorAll("[data-intro-card]")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let timers = [],
    active = false,
    previousFocus,
    current = 0;
  function clear() {
    timers.forEach(clearTimeout);
    timers = [];
  }
  function finish() {
    clear();
    active = false;
    overlay.hidden = true;
    document.body.classList.remove("intro-active");
    onClose();
    previousFocus?.focus?.();
  }
  function card(index) {
    current = index;
    cards.forEach((element, i) => {
      element.classList.toggle("is-active", i === index);
      element.setAttribute("aria-hidden", String(i !== index));
    });
  }
  function play() {
    clear();
    onOpen();
    previousFocus = document.activeElement;
    active = true;
    overlay.hidden = false;
    // Restart CSS timelines instead of resuming the previous progress/portrait animation.
    overlay.classList.remove("intro-playing");
    void overlay.offsetWidth;
    overlay.classList.add("intro-playing");
    document.body.classList.add("intro-active");
    overlay.classList.toggle("intro-static", reduced);
    button.textContent = reduced ? "Continue →" : "Skip intro →";
    card(0);
    button.focus();
    if (reduced) {
      return;
    }
    timers.push(
      setTimeout(() => card(1), 4400),
      setTimeout(() => card(2), 9100),
      setTimeout(() => card(3), 12400),
      setTimeout(finish, 15600),
    );
  }
  button.onclick = () => {
    if (reduced && current < cards.length - 1) card(current + 1);
    else finish();
  };
  document.getElementById("intro-replay").onclick = play;
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") finish();
    if (event.key === "Tab") {
      event.preventDefault();
      (document.activeElement === button
        ? document.querySelector("[data-intro-audio]")
        : button
      ).focus();
    }
  });
  /* Always begin at the portrait, including reloads and replay. */
  play();
  return {
    play,
    get active() {
      return active;
    },
  };
}
