import {BargeDetector} from '../bargeIn';

/** 20 ms of 16 kHz int16 PCM at a constant amplitude (0..1). */
const chunk = (amp: number): Uint8Array => {
  const s = new Int16Array(320).fill(Math.round(amp * 32767));
  return new Uint8Array(s.buffer);
};

describe('BargeDetector', () => {
  it('fires after enough loud speech and keeps the audio', () => {
    const d = new BargeDetector(0.03, 100);
    const fired = [0, 1, 2, 3, 4].map(() => d.push(chunk(0.2)));
    expect(fired).toEqual([false, false, false, false, true]);
    expect(d.take()).toHaveLength(5);
  });

  it('ignores a short burst followed by quiet', () => {
    const d = new BargeDetector(0.03, 100);
    d.push(chunk(0.2));
    d.push(chunk(0));
    d.push(chunk(0));
    expect(d.push(chunk(0.2))).toBe(false);
    expect(d.take()).toHaveLength(1);
  });

  it('never fires on quiet audio', () => {
    const d = new BargeDetector(0.03, 100);
    for (let i = 0; i < 50; i++) {
      expect(d.push(chunk(0.01))).toBe(false);
    }
  });
});
