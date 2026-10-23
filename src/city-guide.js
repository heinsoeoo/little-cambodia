export function createCityGuide({ onMap }) {
  const $ = (id) => document.getElementById(id);
  const tabs = [...document.querySelectorAll("[data-guide-tab]")];
  function select(id, focus = false) {
    for (const tab of tabs) {
      const active = tab.dataset.guideTab === id;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    }
    for (const panel of document.querySelectorAll("[data-guide-panel]"))
      panel.hidden = panel.dataset.guidePanel !== id;
  }
  tabs.forEach((tab, index) => {
    tab.onclick = () => select(tab.dataset.guideTab);
    tab.onkeydown = (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
        return;
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
              tabs.length;
      select(tabs[next].dataset.guideTab, true);
    };
  });
  $("guide-map").onclick = onMap;
  select("explore");
  return {
    update(player, game) {
      $("guide-player").textContent = player?.nickname || "";
      $("guide-stamps").textContent = String(game.stamps);
      $("guide-completed").textContent = String(
        Object.values(game.completed).reduce((sum, count) => sum + count, 0),
      );
    },
  };
}
