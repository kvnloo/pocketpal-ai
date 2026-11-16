import {int16PcmToFloat32} from '../asr/energyVad';

import {VOICE_BARGE_MIN_MS, VOICE_BARGE_RMS} from './constants';

const BYTES_PER_MS = 32; // 16 kHz mono 16-bit

const rms = (chunk: Uint8Array): number => {
  const s = int16PcmToFloat32(chunk);
  if (s.length === 0) {
    return 0;
  }
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    sum += s[i]! * s[i]!;
  }
  return Math.sqrt(sum / s.length);
};

/**
 * Hears the user talking over the assistant: `VOICE_BARGE_MIN_MS` of loud
 * voiced audio with at most one quiet chunk between. A door slam or a cough
 * is too short; the assistant's own voice is removed by the echo-cancelling
 * capture source before it gets here. Keeps the audio from the first voiced
 * chunk so the interrupting words are not lost.
 */
export class BargeDetector {
  private chunks: Uint8Array[] = [];
  private voicedBytes = 0;
  private quiet = 0;

  constructor(
    private readonly threshold = VOICE_BARGE_RMS,
    private readonly minMs = VOICE_BARGE_MIN_MS,
  ) {}

  /** True when this chunk completes a barge-in. */
  push(chunk: Uint8Array): boolean {
    if (rms(chunk) >= this.threshold) {
      this.chunks.push(chunk);
      this.voicedBytes += chunk.length;
      this.quiet = 0;
    } else if (this.voicedBytes > 0) {
      this.chunks.push(chunk);
      if (++this.quiet > 1) {
        this.reset();
      }
    }
    return this.voicedBytes >= this.minMs * BYTES_PER_MS;
  }

  /** The audio heard since speech began; the detector starts over. */
  take(): Uint8Array[] {
    const chunks = this.chunks;
    this.reset();
    return chunks;
  }

  reset(): void {
    this.chunks = [];
    this.voicedBytes = 0;
    this.quiet = 0;
  }
}
