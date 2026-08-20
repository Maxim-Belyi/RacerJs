export const Sounds = {
  audio: {},
  isPlaying: true,
  isMuted: false,

  init() {
    this.audio.main = new Audio('./media/background-music.mp3');
    this.audio.main.volume = 0.4;

    this.audio.coin = new Audio('./media/coin.mp3');
    this.audio.coin.volume = 0.3;

    this.audio.arrow = new Audio('./media/engine-force.mp3');
    this.audio.arrow.volume = 0.3;

    this.audio.slow = new Audio('./media/slow.mp3');
    this.audio.slow.volume = 0.5;
  },

  play(name) {
    this.audio[name].play();
  },

  pauseAll() {
    Object.values(this.audio).forEach((audio) => audio.pause());
  },

  resumeAll() {
    Object.values(this.audio).forEach((audio) => audio.play());
  },

  toggleMute() {
    if (this.isPlaying) {
      this.pauseAll();
      this.isPlaying = false;
      this.isMuted = true;
    } else if (this.isMuted) {
      this.resumeAll();
      this.isPlaying = true;
      this.isMuted = false;
    }  
  },
};
Sounds.init();

