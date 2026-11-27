const homeMenu = document.querySelector(".home-menu");
homeMenu.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    homeMenu.open = false;
  });
});

homeMenu.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !homeMenu.open) return;
  homeMenu.open = false;
  homeMenu.querySelector("summary").focus();
});

const track = document.querySelector(".viewfinder-track");
const videos = [...track.querySelectorAll("video")];
const play = document.querySelector(".camera-play");
const fullscreenButton = document.querySelector(".camera-fullscreen");
const fullscreenStatus = document.querySelector(".camera-fullscreen-status");
const previous = document.querySelector(".camera-prev");
const next = document.querySelector(".camera-next");
const captionTitle = document.querySelector(".camera-caption h2");
const captionDescription = document.querySelector(".camera-caption p");
const count = document.querySelector(".camera-count");
const time = document.querySelector(".camera-time");
let activeIndex = 0;
let fullscreenVideo;

function formatNumber(value) {
  return String(value).padStart(2, "0");
}

function updatePlayback() {
  const video = videos[activeIndex];
  const playing = !video.paused && !video.ended;
  const duration = Number.isFinite(video.duration) ? Math.floor(video.duration) : 0;

  play.toggleAttribute("data-playing", playing);
  play.disabled = Boolean(video.error);
  play.setAttribute("aria-label", video.error
    ? `${video.ariaLabel} video unavailable`
    : `${playing ? "Pause" : "Play"} ${video.ariaLabel}`);
  const canGoFullscreen = document.fullscreenEnabled || video.webkitSupportsFullscreen;
  fullscreenButton.hidden = Boolean(video.error) || !canGoFullscreen ||
    (!playing && video.currentTime === 0);
  time.textContent = `${formatNumber(Math.floor(duration / 60))}:${formatNumber(duration % 60)}`;
}

function showVideo(index) {
  if (index < 0 || index >= videos.length || index === activeIndex) return;

  videos[activeIndex].pause();
  videos[activeIndex].setAttribute("aria-hidden", "true");
  activeIndex = index;
  fullscreenStatus.textContent = "";

  const video = videos[activeIndex];
  const number = formatNumber(activeIndex + 1);
  video.removeAttribute("aria-hidden");
  track.style.setProperty("--slide-offset", `${-100 * activeIndex}%`);
  captionTitle.textContent = video.ariaLabel;
  captionDescription.textContent = video.dataset.caption;
  count.textContent = `${number} / ${formatNumber(videos.length)}`;
  previous.setAttribute("aria-disabled", String(activeIndex === 0));
  next.setAttribute("aria-disabled", String(activeIndex === videos.length - 1));
  updatePlayback();
}

previous.addEventListener("click", () => showVideo(activeIndex - 1));
next.addEventListener("click", () => showVideo(activeIndex + 1));

play.addEventListener("click", async () => {
  const video = videos[activeIndex];
  if (!video.paused && !video.ended) {
    video.pause();
    return;
  }

  try {
    await video.play();
  } catch {
    updatePlayback();
  }
});

function restoreInlineControls() {
  if (!fullscreenVideo) return;

  fullscreenVideo.controls = false;
  fullscreenVideo = undefined;
  if (!fullscreenButton.hidden) fullscreenButton.focus({ preventScroll: true });
}

fullscreenButton.addEventListener("click", async () => {
  if (fullscreenVideo) return;

  const video = videos[activeIndex];
  fullscreenStatus.textContent = "";
  fullscreenVideo = video;
  video.controls = true;

  try {
    if (document.fullscreenEnabled) {
      await video.requestFullscreen();
    } else {
      video.webkitEnterFullscreen();
    }
  } catch {
    restoreInlineControls();
    fullscreenStatus.textContent = "Full screen is unavailable.";
  }
});

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) restoreInlineControls();
});

videos.forEach((video, index) => {
  video.addEventListener("webkitendfullscreen", restoreInlineControls);
  ["loadedmetadata", "play", "pause", "ended", "error"].forEach((event) => {
    video.addEventListener(event, () => {
      if (index === activeIndex) updatePlayback();
    });
  });
});

updatePlayback();

const bookingPrints = document.querySelector(".booking-prints");
const bookingDialog = document.querySelector(".booking-dialog");
const bookingTitle = document.querySelector("#booking-title");

bookingPrints.querySelectorAll(".booking-print[data-booking]").forEach((print) => {
  print.addEventListener("click", () => {
    bookingTitle.textContent = print.dataset.booking;
    bookingDialog.showModal();
  });
});

function setupBookingPrints() {
  const audio = window.marvinBookingAudio;
  const midpoint = bookingPrints.querySelector(".booking-midpoint");
  const startControl = bookingPrints.querySelector(".print-start");
  const startButton = startControl.querySelector("button");
  const gestures = new AbortController();
  const playing = new Map();
  let context;
  let recording;
  let printerOutput;
  let audioUnavailable = !audio?.supported;
  let midpointVisible = false;
  let started = false;

  function printWhenReady() {
    if (!midpointVisible || started) return;

    if (!audioUnavailable && (!recording || context.state !== "running")) {
      startControl.hidden = context?.state === "running";
      return;
    }

    started = true;
    startControl.hidden = true;
    gestures.abort();
    midpointObserver.disconnect();
    bookingPrints.classList.remove("is-awaiting-print");
    bookingPrints.classList.add("is-printing");
  }

  async function prepareSound() {
    if (audioUnavailable || context) return;

    try {
      context = audio.getContext();
      context.addEventListener("statechange", printWhenReady);
      printerOutput = context.createGain();
      printerOutput.gain.value = 3;
      printerOutput.connect(context.destination);
      recording = await audio.loadRecording();
    } catch {
      audioUnavailable = true;
    }
    printWhenReady();
  }

  function unlockSound() {
    if (started || audioUnavailable) return;
    prepareSound();
    if (context?.state === "running") {
      printWhenReady();
    } else {
      // Call resume synchronously from the trusted click or keypress.
      context?.resume().then(printWhenReady, printWhenReady);
    }
  }

  function unlockFromPage(event) {
    if (!event.target.closest?.(".print-start")) unlockSound();
  }

  ["click", "keydown"].forEach(type => {
    window.addEventListener(type, unlockFromPage, { capture: true, signal: gestures.signal });
  });
  startButton.addEventListener("click", () => {
    midpointVisible = true;
    unlockSound();
  });

  bookingPrints.addEventListener("animationstart", (event) => {
    if (event.animationName !== "feed-print" || !recording || context.state !== "running") return;

    const source = context.createBufferSource();
    source.buffer = recording;
    source.connect(printerOutput);
    source.start();
    playing.set(event.target, source);
  });

  ["animationend", "animationcancel"].forEach(type => {
    bookingPrints.addEventListener(type, (event) => {
      if (event.animationName !== "feed-print") return;
      playing.get(event.target)?.stop();
      playing.delete(event.target);
    });
  });

  const audioObserver = new IntersectionObserver(([entry], observer) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    prepareSound();
  }, { rootMargin: "650px 0px" });

  const midpointObserver = new IntersectionObserver(([entry]) => {
    midpointVisible = entry.isIntersecting;
    if (midpointVisible) prepareSound();
    printWhenReady();
  });

  bookingPrints.classList.add("is-awaiting-print");
  audioObserver.observe(bookingPrints);
  midpointObserver.observe(midpoint);
}

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  setupBookingPrints();
}

const photoDialog = document.querySelector(".photo-dialog");
const photoDialogGallery = photoDialog.querySelector(".photo-dialog-gallery");
const photoCollage = document.querySelector(".photo-collage");
const eventPhotos = Array.from(photoCollage.querySelectorAll(".photo-open img"));
const photoMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const resumeDelay = 1200;
let pressedPointer;
let pressedRow;
let dialogRow;
let drag;
let dragged = false;

window.addEventListener("pointermove", (event) => {
  if (!drag || event.pointerId !== pressedPointer) return;

  const distance = event.clientX - drag.startX;
  if (!dragged && Math.abs(distance) < 6) return;
  if (!dragged) {
    dragged = true;
    drag.row.setPointerCapture(event.pointerId);
    drag.row.classList.add("is-dragging");
  }
  drag.row.scrollLeft = drag.startScroll - distance;
});

function releasePhotoPointer(event) {
  if (event.pointerId !== pressedPointer) return;

  if (drag) drag.row.classList.remove("is-dragging");
  pressedRow.resumeAt = performance.now() + resumeDelay;
  drag = undefined;
  pressedRow = undefined;
  pressedPointer = undefined;
}

window.addEventListener("pointerup", releasePhotoPointer);
window.addEventListener("pointercancel", releasePhotoPointer);
photoCollage.addEventListener("dragstart", event => event.preventDefault());

const photoRows = Array.from(photoCollage.querySelectorAll(".photo-row"), (row) => {
  const strip = row.querySelector(".photo-strip");
  const first = strip.firstElementChild;
  const copies = document.createDocumentFragment();
  Array.from(strip.children).forEach((photo) => {
    const copy = photo.cloneNode(true);
    copy.hidden = true;
    copy.classList.add("photo-repeat");
    copy.setAttribute("aria-hidden", "true");
    copy.querySelector(".photo-open").tabIndex = -1;
    copies.append(copy);
  });
  const firstCopy = copies.firstElementChild;
  strip.append(copies);
  row.classList.add("is-looping");

  const state = {
    row,
    direction: row.classList.contains("photo-row--right") ? -1 : 1,
    span: 0,
    position: null,
    lastAutoScroll: row.scrollLeft,
    resumeAt: 0,
    hovered: false,
  };

  function delayPhotoMotion() {
    state.resumeAt = performance.now() + resumeDelay;
  }

  row.addEventListener("click", (event) => {
    const selectedPhoto = event.target.closest(".photo-open")?.querySelector("img");
    if (!selectedPhoto || (event.detail > 0 && dragged)) return;

    const photos = [selectedPhoto, ...eventPhotos.filter(photo => photo.src !== selectedPhoto.src)];
    photoDialogGallery.replaceChildren(...photos.map((photo, index) => {
      const image = photo.cloneNode();
      image.loading = index === 0 ? "eager" : "lazy";
      image.src = photo.dataset.fullSrc;
      return image;
    }));
    dialogRow = row;
    photoDialog.showModal();
    photoDialog.scrollTop = 0;
  });

  row.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") state.hovered = true;
  });

  row.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse") state.hovered = false;
    delayPhotoMotion();
  });

  row.addEventListener("wheel", delayPhotoMotion, { passive: true });

  row.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;

    pressedPointer = event.pointerId;
    pressedRow = state;
    dragged = false;
    delayPhotoMotion();
    if (event.pointerType === "mouse") {
      drag = { row, startX: event.clientX, startScroll: row.scrollLeft };
    }
  });

  new ResizeObserver(() => {
    state.span = firstCopy.offsetLeft - first.offsetLeft;
    state.position = null;
  }).observe(strip);

  row.addEventListener("scroll", () => {
    if (Math.abs(row.scrollLeft - state.lastAutoScroll) > 1) {
      state.position = null;
      delayPhotoMotion();
    }
  }, { passive: true });

  return state;
});

let photoFrame;
let lastPhotoFrame;

function advancePhotoRows(now) {
  const elapsed = lastPhotoFrame === undefined ? 0 : Math.min(now - lastPhotoFrame, 50);
  lastPhotoFrame = now;

  photoRows.forEach((state) => {
    const { row, span, direction } = state;
    const paused = photoMotion.matches || state.hovered || pressedRow === state ||
      now < state.resumeAt || (photoDialog.open && dialogRow === row) ||
      row.matches(":focus-visible") || row.querySelector(":focus-visible");

    if (paused || !state.span) {
      state.position = null;
      return;
    }

    const next = (state.position ?? row.scrollLeft) + direction * span * elapsed / 75000;
    state.position = ((next % span) + span) % span;
    row.scrollLeft = state.position;
    state.lastAutoScroll = row.scrollLeft;
  });

  photoFrame = requestAnimationFrame(advancePhotoRows);
}

new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) {
    photoFrame = requestAnimationFrame(advancePhotoRows);
  } else {
    cancelAnimationFrame(photoFrame);
    lastPhotoFrame = undefined;
  }
}).observe(photoCollage);
