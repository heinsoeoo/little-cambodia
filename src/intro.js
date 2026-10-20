export function createIntro({
  onOpen = () => {},
  onClose = () => {},
  onCard = () => {},
  autoplay = true,
} = {}) {
  const overlay = document.getElementById("intro"),
    button = document.getElementById("intro-skip"),
    motionButton = document.getElementById("intro-motion"),
    cards = [...overlay.querySelectorAll("[data-intro-card]")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let animateAnyway = false;
  try {
    animateAnyway = localStorage.getItem("phnom-intro-animate") === "1";
  } catch {}
  const isStatic = () => reduced && !animateAnyway;
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
    onCard(index);
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
    overlay.classList.toggle("intro-static", isStatic());
    overlay.classList.toggle("intro-force-motion", reduced && animateAnyway);
    motionButton.hidden = !reduced;
    motionButton.textContent = animateAnyway
      ? "Use reduced motion"
      : "Animate intro anyway";
    motionButton.setAttribute("aria-pressed", String(animateAnyway));
    button.textContent = isStatic() ? "Continue →" : "Skip intro →";
    card(0);
    button.focus();
    if (isStatic()) {
      return;
    }
    let elapsed = 0;
    cards.forEach((element, index) => {
      elapsed += Number(element.dataset?.duration) || 5000;
      timers.push(
        setTimeout(
          index === cards.length - 1 ? finish : () => card(index + 1),
          elapsed,
        ),
      );
    });
    overlay.style?.setProperty("--intro-duration", `${elapsed}ms`);
  }
  button.onclick = () => {
    if (isStatic() && current < cards.length - 1) card(current + 1);
    else finish();
  };
  motionButton.onclick = () => {
    animateAnyway = !animateAnyway;
    try {
      localStorage.setItem("phnom-intro-animate", animateAnyway ? "1" : "0");
    } catch {}
    play();
    motionButton.focus();
  };
  document.getElementById("intro-replay").onclick = play;
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") finish();
    if (event.key === "Tab") {
      event.preventDefault();
      const controls = [...overlay.querySelectorAll("button")].filter(
        (control) => !control.hidden,
      );
      const index = controls.indexOf(document.activeElement);
      controls[
        (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length
      ]?.focus();
    }
  });
  /* Begin after the external-browser tip when Facebook embeds the game. */
  if (autoplay) play();
  else {
    overlay.hidden = true;
    document.body.classList.remove("intro-active");
  }
  return {
    play,
    get active() {
      return active;
    },
  };
}
