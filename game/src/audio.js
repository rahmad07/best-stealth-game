// The Quiet Gallery — sound. A tiny WebAudio synth, no audio files: soft
// footsteps for the player, quieter taps for nearby guards (so you hear a
// patrol before you see it), a sting when spotted, a chime for a relic and
// a short figure for the win. Everything is optional and starts on the
// first user gesture.
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(frequency, duration, type, gainValue, when = 0) {
    if (muted) return;
    const audio = ensure();
    if (!audio) return;
    const start = audio.currentTime + when;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  /** A short filtered thud; `loud` 0..1 scales it (guards are heard by distance). */
  function thud(loud) {
    if (muted) return;
    const audio = ensure();
    if (!audio) return;
    const start = audio.currentTime;
    const buffer = audio.createBuffer(1, 2205, 44100);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    gain.gain.value = 0.25 * loud;
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(audio.destination);
    source.start(start);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    playerStep(sneaking) {
      thud(sneaking ? 0.25 : 0.6);
    },
    guardStep(distance) {
      const loud = Math.max(0, 1 - distance / 320);
      if (loud > 0.08) thud(0.5 * loud);
    },
    coin() {
      tone(1900, 0.09, 'sine', 0.12);
      tone(2400, 0.12, 'sine', 0.1, 0.07);
    },
    relic() {
      tone(660, 0.12, 'sine', 0.14);
      tone(880, 0.16, 'sine', 0.14, 0.09);
      tone(1320, 0.2, 'sine', 0.1, 0.18);
    },
    spotted() {
      tone(220, 0.16, 'sawtooth', 0.14);
      tone(330, 0.22, 'sawtooth', 0.14, 0.12);
    },
    caught() {
      tone(180, 0.3, 'sawtooth', 0.16);
      tone(120, 0.4, 'sawtooth', 0.16, 0.2);
    },
    win() {
      [523, 659, 784, 1047].forEach((frequency, index) => {
        tone(frequency, 0.22, 'sine', 0.14, index * 0.11);
      });
    },
  };
}
