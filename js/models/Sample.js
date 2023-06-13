export default class Sample {
  constructor(url) {
    this.status = false;
    this.element = new Audio(url);
  }

  play() {
    this.status = true;
    this.element.play();
  }

  pause() {
    this.status = false;
    this.element.pause();
  }

  stop() {
    this.status = false;
    this.element.pause();
    this.element.currentTime = 0;
  }

  setVolume(value) {
    this.element.volume = value;
  }

  getVolume() {
    return this.element.volume;
  }

  getDuration() {
    return this.element.duration;
  }

  isPlaying() {
    return this.status;
  }
}
