// Playback through one shared <audio> element. iOS only allows playback that starts from a user
// gesture; reusing the element that the gesture unlocked lets A-B playback continue by itself.
export type AudioSource = Blob | string;

let el: HTMLAudioElement | undefined;
let currentUrl: string | undefined;
let settle: (() => void) | undefined;

export function stopPlayback(): void {
  if (el) { el.pause(); el.removeAttribute('src'); }
  if (currentUrl) { URL.revokeObjectURL(currentUrl); currentUrl = undefined; }
  settle?.();
  settle = undefined;
}

export function play(src: AudioSource): Promise<void> {
  stopPlayback();
  el ??= new Audio();
  const audio = el;
  const url = typeof src === 'string' ? src : (currentUrl = URL.createObjectURL(src));
  return new Promise((resolve) => {
    settle = resolve;
    audio.onended = () => { if (settle === resolve) stopPlayback(); };
    audio.onerror = () => { if (settle === resolve) stopPlayback(); };
    audio.src = url;
    audio.play().catch(() => { if (settle === resolve) stopPlayback(); });
  });
}

export async function playSequence(sources: AudioSource[]): Promise<void> {
  for (const s of sources) await play(s);
}

let ctx: AudioContext | undefined;
/** A short, quiet confirmation tone. iOS has no vibration API, so this stands in for haptics. */
export function chime(kind: 'good' | 'again' | 'done'): void {
  try {
    navigator.vibrate?.(kind === 'again' ? 30 : 10);
    ctx ??= new AudioContext();
    const notes = kind === 'good' ? [660] : kind === 'again' ? [330] : [523, 659, 784];
    notes.forEach((freq, i) => {
      const t = ctx!.currentTime + i * 0.09;
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  } catch {
    /* sound is optional */
  }
}
