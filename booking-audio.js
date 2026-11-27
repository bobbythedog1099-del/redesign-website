window.marvinBookingAudio = (() => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let context;
  let recording;

  function loadBookingRecording() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "assets/dnpsound3-data.js";
      script.addEventListener("load", () => {
        const encoded = window.marvinDnpSound;
        delete window.marvinDnpSound;
        script.remove();
        resolve(encoded);
      }, { once: true });
      script.addEventListener("error", () => {
        script.remove();
        reject(new Error("Could not load the booking recording."));
      }, { once: true });
      document.head.append(script);
    }).then(encoded => Uint8Array.from(atob(encoded), character => character.charCodeAt(0)).buffer);
  }

  function getContext() {
    return context ??= new AudioContext();
  }

  return {
    supported: Boolean(AudioContext),
    getContext,
    loadRecording() {
      recording ??= loadBookingRecording().then(bytes => getContext().decodeAudioData(bytes));
      return recording;
    },
  };
})();
