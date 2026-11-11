/*
 * The rising "wooop" played when something is added to the cart.
 * Made with the Web Audio API, so there is no sound file to download. It
 * must be started from a click (browsers block sound otherwise), which is
 * how add-to-cart is always called. Any failure is silent.
 */

const SOUND_LENGTH = 0.42; // seconds

/**
 * Schedules the sound on any audio context (a live one in the browser, or
 * an offline one when testing). Returns when it ends.
 */
export function scheduleAddToCartSound(context, destination, startAt) {
  const start = startAt;
  const end = start + SOUND_LENGTH;

  // Loud enough to notice: quick rise, a held body while the pitch climbs,
  // then a soft fade.
  const output = context.createGain();
  output.gain.setValueAtTime(0.0001, start);
  output.gain.linearRampToValueAtTime(0.32, start + 0.02);
  output.gain.linearRampToValueAtTime(0.26, start + 0.2);
  output.gain.exponentialRampToValueAtTime(0.0001, end);
  output.connect(destination);

  // A sine sliding up, with a quieter triangle an octave below for a
  // rounder "wooop".
  const voices = [
    { type: "sine", from: 260, to: 780, level: 1 },
    { type: "triangle", from: 130, to: 390, level: 0.45 }
  ];

  voices.forEach((voice) => {
    const oscillator = context.createOscillator();
    const level = context.createGain();

    oscillator.type = voice.type;
    oscillator.frequency.setValueAtTime(voice.from, start);
    oscillator.frequency.exponentialRampToValueAtTime(voice.to, start + 0.24);
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

  return { output, end };
}

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

    const { output } = scheduleAddToCartSound(
      audioContext,
      audioContext.destination,
      audioContext.currentTime + 0.02
    );

    setTimeout(() => output.disconnect(), 1000);
  } catch {
    // Sound is a nice-to-have; never let it break adding to the cart.
  }
}
