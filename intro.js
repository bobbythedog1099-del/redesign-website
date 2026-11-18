const grid = document.querySelector(".collage-grid");
const scrollCue = document.querySelector(".scroll-cue");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let entering = false;
let rotation;
let touchStartY;

function blockInputDuringTransition(event) {
  if (!entering) return;
  if (event.cancelable) event.preventDefault();
  event.stopImmediatePropagation();
}

[
  "wheel", "touchstart", "touchmove", "touchend", "pointerdown", "pointerup",
  "click", "dblclick", "auxclick", "contextmenu", "keydown", "keyup", "dragstart", "drop",
].forEach((type) => {
  window.addEventListener(type, blockInputDuringTransition, { capture: true, passive: false });
});

async function enterHome() {
  if (entering) return;
  entering = true;

  if (!reducedMotion.matches && grid.animate) {
    rotation = grid.animate([
      { transform: "translate(-50%, -50%) rotate(30deg)" },
      { transform: "translate(-50%, -50%) rotate(0deg)" },
    ], {
      duration: 2400,
      easing: "cubic-bezier(.4, 0, .25, 1)",
      fill: "forwards",
    });
    await rotation.finished;
  }

  window.location.assign(scrollCue.href);
}

window.addEventListener("wheel", (event) => {
  if (event.deltaY <= 0 || event.ctrlKey) return;
  event.preventDefault();
  enterHome();
}, { passive: false });

window.addEventListener("touchstart", (event) => {
  touchStartY = event.touches.length === 1 ? event.touches[0].clientY : undefined;
}, { passive: true });

window.addEventListener("touchend", (event) => {
  const swipeDistance = touchStartY - event.changedTouches[0].clientY;
  touchStartY = undefined;
  if (swipeDistance > 35) enterHome();
}, { passive: true });

window.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === " " && event.shiftKey) return;
  if (!["ArrowDown", "PageDown", "End", " "].includes(event.key)) return;
  event.preventDefault();
  enterHome();
});

scrollCue.addEventListener("click", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  event.preventDefault();
  enterHome();
});

window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  rotation?.cancel();
  entering = false;
});

grid.querySelectorAll(".collage-track").forEach((track) => {
  const copy = track.firstElementChild.cloneNode(true);
  copy.hidden = true;
  track.append(copy);
});
grid.classList.add("is-moving");
