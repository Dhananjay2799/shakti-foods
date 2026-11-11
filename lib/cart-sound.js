/*
 * The short rising "woop" played when something is added to the cart.
 * Made with the Web Audio API, so there is no sound file to download. It
 * must be started from a click (browsers block sound otherwise), which is
 * how add-to-cart is always called. Any failure is silent.
 */

let audioContext = null;

export function playAddToCartSound() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    audioContext = audioContext || new AudioContextClass();

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    const start = audioContext.currentTime + 0.01;
    const end = start + 0.24;

    const output = audioContext.createGain();
    output.gain.setValueAtTime(0.0001, start);
    output.gain.exponentialRampToValueAtTime(0.16, start + 0.025);
    output.gain.exponentialRampToValueAtTime(0.0001, end);
    output.connect(audioContext.destination);

    // A soft sine sweeping up, with a quieter triangle an octave below for
    // a rounder "woop".
    const voices = [
      { type: "sine", from: 330, to: 880, level: 1 },
      { type: "triangle", from: 165, to: 440, level: 0.35 }
    ];

    voices.forEach((voice) => {
      const oscillator = audioContext.createOscillator();
      const level = audioContext.createGain();

      oscillator.type = voice.type;
      oscillator.frequency.setValueAtTime(voice.from, start);
      oscillator.frequency.exponentialRampToValueAtTime(voice.to, start + 0.14);
      level.gain.value = voice.level;

      oscillator.connect(level);
      level.connect(output);
      oscillator.start(start);
      oscillator.stop(end + 0.02);

      oscillator.onended = () => {
        oscillator.disconnect();
        level.disconnect();
      };
    });

    setTimeout(() => output.disconnect(), 600);
  } catch {
    // Sound is a nice-to-have; never let it break adding to the cart.
  }
}
