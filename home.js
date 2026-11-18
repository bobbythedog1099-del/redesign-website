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

window.addEventListener("load", () => {
  bookingPrints.classList.add("is-printing");
}, { once: true });

document.querySelectorAll(".photo-row").forEach((row) => {
  const track = row.querySelector(".photo-track");
  const copy = track.firstElementChild.cloneNode(true);
  copy.setAttribute("aria-hidden", "true");
  track.append(copy);
  row.classList.add("is-moving");
});
