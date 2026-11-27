(() => {
  const hero = document.querySelector(".hero");
  const grid = document.querySelector(".collage-grid");
  const holdCue = document.querySelector(".hold-cue");
  const introStyle = document.querySelector('link[rel="stylesheet"]');
  const homeUrl = holdCue.href;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const holdDuration = 2400;
  const introEvents = new AbortController();
  const options = { signal: introEvents.signal };
  let hold;
  let rotation;
  let holdTimer;
  let entering = false;
  let homeRequest;
  let settleRelease;

  function unlockBookingAudio() {
    const audio = window.marvinBookingAudio;
    if (reducedMotion.matches || !audio?.supported) return;

    try {
      const context = audio.getContext();
      if (context.state !== "running") context.resume().catch(() => {});
      audio.loadRecording().catch(() => {});
    } catch {
      // The home view can still load if the browser cannot enable audio.
    }
  }

  function prepareHome() {
    if (location.protocol === "file:") return Promise.resolve(null);

    homeRequest ??= fetch(homeUrl).then(async response => {
      if (!response.ok) throw new Error("Could not load the home view.");

      const page = new DOMParser().parseFromString(await response.text(), "text/html");
      const stylePath = page.querySelector('link[rel="stylesheet"]')?.getAttribute("href");
      const scriptPath = page.querySelector("script[data-home-entry]")?.getAttribute("src");
      if (!page.body.classList.contains("home") || !stylePath || !scriptPath) {
        throw new Error("Home view resources are incomplete.");
      }

      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = new URL(stylePath, homeUrl);
      style.media = "not all";
      const styleReady = new Promise((resolve, reject) => {
        style.addEventListener("load", resolve, { once: true });
        style.addEventListener("error", reject, { once: true });
      });
      document.head.append(style);

      const scriptUrl = new URL(scriptPath, homeUrl);
      const preload = document.createElement("link");
      preload.rel = "preload";
      preload.as = "script";
      preload.href = scriptUrl;
      document.head.append(preload);

      await styleReady;
      return { page, style, scriptUrl };
    }).catch(() => null);
    return homeRequest;
  }

  async function enterHome() {
    if (entering) return;
    entering = true;
    unlockBookingAudio();
    holdCue.textContent = "Opening…";
    holdCue.setAttribute("aria-label", "Opening Marvin Studio");

    // Let the compatibility click reach the intro before replacing its elements.
    const releaseSettled = hold?.pointer !== undefined ? new Promise(resolve => {
      const timer = window.setTimeout(resolve, hold.pointerType === "touch" ? 340 : 100);
      settleRelease = () => {
        window.clearTimeout(timer);
        resolve();
      };
    }) : Promise.resolve();
    const [home] = await Promise.all([prepareHome(), releaseSettled]);

    if (!home) {
      window.location.assign(homeUrl);
      return;
    }

    try {
      history.pushState(null, "", homeUrl);
    } catch {
      window.location.assign(homeUrl);
      return;
    }

    const script = document.createElement("script");
    script.src = home.scriptUrl;
    script.addEventListener("error", () => window.location.reload(), { once: true });

    introEvents.abort();
    rotation?.cancel();
    document.title = home.page.title;
    home.style.media = "all";
    introStyle.remove();
    document.body.replaceWith(document.importNode(home.page.body, true));
    window.scrollTo(0, 0);
    document.querySelector(".home-logo").focus({ preventScroll: true });
    document.body.append(script);

    const homePath = new URL(homeUrl).pathname;
    window.addEventListener("popstate", () => {
      if (location.pathname !== homePath) window.location.reload();
    });
  }

  function markHoldReady() {
    if (!hold) return;
    hold.ready = true;
    holdCue.textContent = "Release to enter";
    holdCue.setAttribute("aria-label", "Release to enter Marvin Studio");
  }

  function resetCue() {
    holdCue.textContent = "Tap and hold";
    holdCue.setAttribute("aria-label", "Tap and hold to enter Marvin Studio");
  }

  function startHold(input) {
    if (hold || entering) return;
    hold = input;
    hero.classList.add("is-holding");
    prepareHome();

    if (reducedMotion.matches || !grid.animate) {
      holdTimer = window.setTimeout(markHoldReady, holdDuration);
      return;
    }

    if (!rotation) {
      rotation = grid.animate([
        { transform: "translate(-50%, -50%) rotate(30deg)" },
        { transform: "translate(-50%, -50%) rotate(0deg)" },
      ], {
        duration: holdDuration,
        easing: "cubic-bezier(.4, 0, .25, 1)",
        fill: "both",
      });
      rotation.onfinish = () => {
        if (rotation.currentTime >= holdDuration) markHoldReady();
      };
    } else {
      rotation.updatePlaybackRate(1);
      rotation.play();
    }
  }

  function cancelHold() {
    if (!hold || entering) return;
    hold = undefined;
    window.clearTimeout(holdTimer);
    hero.classList.remove("is-holding");
    resetCue();

    if (!rotation) return;
    if (!rotation.currentTime) {
      rotation.cancel();
      rotation = undefined;
      return;
    }
    rotation.updatePlaybackRate(-2.5);
    rotation.play();
  }

  function finishHold() {
    if (hold?.ready || rotation?.currentTime >= holdDuration) enterHome();
    else cancelHold();
  }

  hero.addEventListener("pointerdown", (event) => {
    if (hold || entering || !event.isPrimary || event.button !== 0) return;
    hero.setPointerCapture(event.pointerId);
    startHold({ pointer: event.pointerId, pointerType: event.pointerType, x: event.clientX, y: event.clientY });
    if (event.pointerType !== "touch" || navigator.userActivation?.isActive) unlockBookingAudio();
  }, options);

  hero.addEventListener("pointermove", (event) => {
    if (hold?.pointer !== event.pointerId) return;
    if (Math.hypot(event.clientX - hold.x, event.clientY - hold.y) > 18) cancelHold();
  }, options);

  hero.addEventListener("pointerup", (event) => {
    if (hold?.pointer === event.pointerId) finishHold();
  }, options);

  ["pointercancel", "lostpointercapture"].forEach(type => {
    hero.addEventListener(type, (event) => {
      if (hold?.pointer === event.pointerId) cancelHold();
    }, options);
  });

  hero.addEventListener("contextmenu", event => event.preventDefault(), options);
  hero.addEventListener("touchend", () => {
    if (entering) unlockBookingAudio();
    else if (hold?.pointerType === "touch") finishHold();
  }, options);
  hero.addEventListener("click", (event) => {
    if (!entering) return;
    event.preventDefault();
    unlockBookingAudio();
    settleRelease?.();
  }, options);

  holdCue.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    if (!event.repeat) {
      unlockBookingAudio();
      startHold({ key: event.key });
    }
  }, options);

  window.addEventListener("keyup", (event) => {
    if (hold?.key !== event.key) return;
    event.preventDefault();
    finishHold();
  }, options);

  holdCue.addEventListener("blur", () => {
    if (hold?.key) cancelHold();
  }, options);

  holdCue.addEventListener("click", (event) => {
    event.preventDefault();
    if (event.detail === 0 && !hold) enterHome();
  }, options);

  window.addEventListener("blur", cancelHold, options);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelHold();
  }, options);

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    window.clearTimeout(holdTimer);
    rotation?.cancel();
    rotation = undefined;
    hold = undefined;
    entering = false;
    hero.classList.remove("is-holding");
    resetCue();
  }, options);

  grid.querySelectorAll(".collage-track").forEach((track) => {
    const copy = track.firstElementChild.cloneNode(true);
    copy.hidden = true;
    track.append(copy);
  });
  grid.classList.add("is-moving");
})();
