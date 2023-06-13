import Sample from "./Sample.js";

export default class MusicPlayer {
  /**
   * MusicPlayer constructor
   * @param {[Sample]} samples - Samples array
   * */
  constructor(samples) {
    this.samples = samples;
    this.status = false;
    this.currentSong = 0;
  }

  play() {
    this.status = true;
    this.samples[this.currentSong].play();
  }

  pause() {
    this.status = false;
    this.samples[this.currentSong].pause();
  }

  stop() {
    this.status = false;
    this.samples[this.currentSong].stop();
  }

  set(code) {
    this.currentSong = code;
  }

  isPlaying() {
    return this.status;
  }
}
