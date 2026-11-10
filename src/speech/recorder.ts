// Microphone recording. The mic is requested only when the user taps Record, and every track is
// stopped right after recording so iOS drops the recording indicator.
export interface Recorded { blob: Blob; durationSec: number; mimeType: string; }
export type RecorderError = 'denied' | 'unsupported' | 'failed';

const MIME_CANDIDATES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];

export function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
}

export const canRecord = (): boolean =>
  typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

export class Recorder {
  onLevel?: (level: number) => void; // 0..1, for the level meter
  onFail?: (error: RecorderError) => void; // capture died mid-recording (track "ended")
  private stream?: MediaStream;
  private rec?: MediaRecorder;
  private ctx?: AudioContext;
  private raf = 0;
  private chunks: Blob[] = [];
  private startedAt = 0;

  async start(): Promise<void> {
    if (!canRecord()) throw 'unsupported' satisfies RecorderError;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const name = (e as DOMException)?.name;
      throw (name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'failed') satisfies RecorderError;
    }
    try {
      const mimeType = pickMimeType();
      this.rec = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
      this.chunks = [];
      this.rec.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
      this.rec.onerror = () => this.fail();
      for (const track of this.stream.getAudioTracks()) track.addEventListener('ended', () => this.fail());
      this.rec.start(1000);
      this.startedAt = performance.now();
      this.startMeter();
    } catch {
      this.cleanup();
      throw 'failed' satisfies RecorderError;
    }
  }

  stop(): Promise<Recorded> {
    return new Promise((resolve, reject) => {
      const rec = this.rec;
      if (!rec || rec.state === 'inactive') { this.cleanup(); reject('failed' satisfies RecorderError); return; }
      const durationSec = Math.max(1, Math.round((performance.now() - this.startedAt) / 1000));
      rec.onstop = () => {
        const mimeType = (rec.mimeType || this.chunks[0]?.type || 'audio/mp4').split(';')[0]!;
        const blob = new Blob(this.chunks, { type: mimeType });
        this.cleanup();
        if (blob.size) resolve({ blob, durationSec, mimeType });
        else reject('failed' satisfies RecorderError);
      };
      rec.stop();
    });
  }

  cancel(): void {
    if (this.rec && this.rec.state !== 'inactive') { this.rec.onstop = null; this.rec.stop(); }
    this.cleanup();
  }

  private fail(): void {
    if (!this.stream) return;
    this.cancel();
    this.onFail?.('failed');
  }

  private startMeter(): void {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 256;
      this.ctx.createMediaStreamSource(this.stream!).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const tick = (): void => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += ((v - 128) / 128) ** 2;
        this.onLevel?.(Math.min(1, Math.sqrt(sum / buf.length) * 4));
        this.raf = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* the meter is optional */
    }
  }

  private cleanup(): void {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
    void this.ctx?.close().catch(() => undefined);
    this.ctx = undefined;
    this.rec = undefined;
  }
}
