import Scenario from "./models/Scenario.js";
import MusicPlayer from "./models/MusicPlayer.js";
import Sample from "./models/Sample.js";

const SongsKeys = [
  document.getElementById("Digit1"),
  document.getElementById("Digit2"),
  document.getElementById("Digit3"),
];

const PlayerKeys = {
  Q: document.getElementById("KeyQ"),
  W: document.getElementById("KeyW"),
};

const CameraKeys = {
  left: document.getElementById("KeyA"),
  top: document.getElementById("KeyS"),
  right: document.getElementById("KeyD"),
  free: document.getElementById("KeyF"),
};

const song1 = new Sample("./audio/song_1.mp3");
const song2 = new Sample("./audio/song_2.mp3");
const song3 = new Sample("./audio/song_3.mp3");

const musicPlayer = new MusicPlayer([song1, song2, song3]);

window.addEventListener("load", () => {
  const app = new Scenario("#app");
  app.init({ musicPlayer });

  const audioContext = app.getAudioContext();

  const swapSong = (index) => {
    if (musicPlayer.currentSong === index) {
      return;
    }

    SongsKeys.forEach((key, i) =>
      key.classList[i === index ? "add" : "remove"]("active")
    );

    musicPlayer.pause();
    audioContext.suspend();
    musicPlayer.currentSong = index;
    musicPlayer.play();
    audioContext.resume();

    app.onSongChange(index);
  };

  const swapCamera = (position) => {
    app.onCameraChange(position);

    Object.keys(CameraKeys).forEach((key) =>
      CameraKeys[key].classList[key === position ? "add" : "remove"]("active")
    );
  };

  window.addEventListener("keydown", ({ code }) => {
    switch (code) {
      case "Digit1":
        swapSong(0);
        break;
      case "Digit2":
        swapSong(1);
        break;
      case "Digit3":
        swapSong(2);
        break;
      case "KeyQ":
        musicPlayer.stop();
        PlayerKeys.W.classList.remove("active");
        break;
      case "KeyW":
        if (musicPlayer.isPlaying()) {
          musicPlayer.pause();
          audioContext.suspend();
          PlayerKeys.W.classList.remove("active");
        } else {
          musicPlayer.play();
          audioContext.resume();
          PlayerKeys.W.classList.add("active");
        }
        break;
      case "KeyA":
        swapCamera("left");
        break;
      case "KeyS":
        swapCamera("top");
        break;
      case "KeyD":
        swapCamera("right");
        break;
      case "KeyF":
        swapCamera("free");
        break;
      default:
        break;
    }
  });

  window.addEventListener("resize", () => app.onWindowResize());
  document.addEventListener("mousemove", (event) => app.onMouseMove(event));
});
