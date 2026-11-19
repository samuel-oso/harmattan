const KEY = "harmattan:sound";

type Kind = "tick" | "select" | "switch";
type Shape = { from: number; to: number; ms: number; gain: number; wave: OscillatorType };

// short, quiet tones made on the spot; there are no sound files to download
const SHAPES: Record<Kind, Shape> = {
  tick: { from: 1500, to: 1500, ms: 26, gain: 0.014, wave: "square" },
  select: { from: 520, to: 880, ms: 110, gain: 0.028, wave: "square" },
  switch: { from: 320, to: 190, ms: 90, gain: 0.03, wave: "triangle" },
};

let on = true;
let read = false;
let audio: AudioContext | null = null;
const listeners = new Set<() => void>();

function load() {
  if (read) return;
  read = true;
  try {
    on = localStorage.getItem(KEY) !== "off";
  } catch (error) {
    console.warn("The sound choice could not be read.", error);
  }
}

export const sound = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  enabled() {
    load();
    return on;
  },

  set(next: boolean) {
    read = true;
    on = next;
    try {
      localStorage.setItem(KEY, next ? "on" : "off");
    } catch (error) {
      console.warn("The sound choice could not be saved.", error);
    }
    listeners.forEach((listener) => listener());
  },

  // browsers allow sound only once the visitor has clicked or pressed a key, so this is called from those
  unlock() {
    load();
    if (!on || typeof window.AudioContext !== "function") return;
    audio ??= new window.AudioContext();
    if (audio.state === "suspended") audio.resume().catch((error: unknown) => console.warn("Sound could not be started.", error));
  },

  play(kind: Kind) {
    if (!on || !audio || audio.state !== "running") return;
    const { from, to, ms, gain, wave } = SHAPES[kind];
    const now = audio.currentTime;
    const end = now + ms / 1000;
    const tone = audio.createOscillator();
    const level = audio.createGain();
    tone.type = wave;
    tone.frequency.setValueAtTime(from, now);
    tone.frequency.exponentialRampToValueAtTime(to, end);
    level.gain.setValueAtTime(gain, now);
    level.gain.exponentialRampToValueAtTime(0.0001, end);
    tone.connect(level).connect(audio.destination);
    tone.start(now);
    tone.stop(end + 0.02);
  },
};
