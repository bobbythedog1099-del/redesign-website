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
const previous = document.querySelector(".camera-prev");
const next = document.querySelector(".camera-next");
const captionTitle = document.querySelector(".camera-caption h2");
const captionDescription = document.querySelector(".camera-caption p");
const count = document.querySelector(".camera-count");
const time = document.querySelector(".camera-time");
let activeIndex = 0;

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
  time.textContent = `${formatNumber(Math.floor(duration / 60))}:${formatNumber(duration % 60)}`;
}

function showVideo(index) {
  if (index < 0 || index >= videos.length || index === activeIndex) return;

  videos[activeIndex].pause();
  videos[activeIndex].setAttribute("aria-hidden", "true");
  activeIndex = index;

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

videos.forEach((video, index) => {
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

bookingPrints.querySelectorAll(".booking-print").forEach((print) => {
  print.addEventListener("click", () => {
    bookingTitle.textContent = print.dataset.booking;
    bookingDialog.showModal();
  });
});

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const bookingMidpoint = bookingPrints.querySelector(".booking-midpoint");
  const printObserver = new IntersectionObserver(([entry], observer) => {
    if (!entry.isIntersecting && entry.boundingClientRect.bottom >= 0) return;

    bookingPrints.classList.remove("is-awaiting-print");
    bookingPrints.classList.add("is-printing");
    observer.disconnect();
  });

  bookingPrints.classList.add("is-awaiting-print");
  printObserver.observe(bookingMidpoint);
}

const photoDialog = document.querySelector(".photo-dialog");
const photoCollage = document.querySelector(".photo-collage");

photoCollage.addEventListener("click", (event) => {
  if (event.target.closest(".photo-open")) photoDialog.showModal();
});

photoCollage.querySelectorAll(".photo-row").forEach((row) => {
  const strip = row.querySelector(".photo-strip");
  const copies = document.createDocumentFragment();
  Array.from(strip.children).forEach((photo) => {
    const copy = photo.cloneNode(true);
    copy.hidden = true;
    copy.classList.add("photo-repeat");
    copy.setAttribute("aria-hidden", "true");
    copy.querySelector(".photo-open").tabIndex = -1;
    copy.style.setProperty("--tilt", getComputedStyle(photo).getPropertyValue("--tilt"));
    copies.append(copy);
  });
  strip.append(copies);
  row.classList.add("is-moving");
});
