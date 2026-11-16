/**
 * The local turn decision between Whisper and the chat model: what a
 * transcript is worth sending. It runs on-device in microseconds, so it can
 * see every utterance, including the ones heard over the assistant's voice.
 *
 * - `ignore`: noise, filler, or a known Whisper hallucination on silence.
 * - `hold`: the speaker paused mid-sentence; wait for the rest.
 * - `send`: a finished turn.
 */
export type TurnAction = 'send' | 'hold' | 'ignore';

export interface TurnDecision {
  action: TurnAction;
  /** The text to send or keep holding (any held prefix merged in). */
  text: string;
  reason: string;
}

/** Whisper's usual output on silence, music or breath. */
const HALLUCINATIONS = new Set([
  'you',
  'thank you',
  'thanks',
  'thank you for watching',
  'thanks for watching',
  'thank you so much for watching',
  'please subscribe',
  'bye',
  'okay bye',
]);

const FILLERS = new Set([
  'um',
  'uh',
  'hmm',
  'hm',
  'mm',
  'mhm',
  'er',
  'ah',
  'eh',
  'oh',
]);

/** Acknowledgements that don't ask for a reply when said over the assistant. */
const BACKCHANNELS = new Set([
  'okay',
  'ok',
  'yeah',
  'yep',
  'yes',
  'right',
  'sure',
  'uh huh',
  'mm hmm',
  'mhm',
  'got it',
  'i see',
  'cool',
  'nice',
]);

/** A turn ending in one of these is unfinished. */
const TRAILING = new Set([
  'and',
  'but',
  'or',
  'so',
  'because',
  'cause',
  'like',
  'if',
  'then',
  'with',
  'to',
  'the',
  'a',
  'an',
  'of',
  'um',
  'uh',
]);

const normalize = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[\u2019']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** `[BLANK_AUDIO]`, `(music)`, `*coughs*` and the like. */
const isAnnotation = (text: string): boolean =>
  /^(\[[^\]]*\]|\([^)]*\)|\*[^*]*\*|\s)+$/.test(text);

export function decideTurn(
  transcript: string,
  {
    held = '',
    overAssistant = false,
  }: {held?: string; overAssistant?: boolean} = {},
): TurnDecision {
  const raw = transcript.trim();
  const merged = held ? `${held} ${raw}`.trim() : raw;
  const words = normalize(raw);

  if (!raw || isAnnotation(raw) || !words) {
    return held
      ? {action: 'send', text: held, reason: 'held_then_silence'}
      : {action: 'ignore', text: '', reason: 'empty'};
  }
  if (!held && HALLUCINATIONS.has(words)) {
    return {action: 'ignore', text: '', reason: 'hallucination'};
  }
  const tokens = words.split(' ');
  if (!held && tokens.every(t => FILLERS.has(t))) {
    return {action: 'ignore', text: '', reason: 'filler'};
  }
  if (!held && overAssistant && BACKCHANNELS.has(words)) {
    return {action: 'ignore', text: '', reason: 'backchannel'};
  }
  const last = tokens[tokens.length - 1]!;
  if (TRAILING.has(last) || /(,|\.\.\.|…|-)\s*$/.test(raw)) {
    return {action: 'hold', text: merged, reason: `trailing:${last}`};
  }
  return {action: 'send', text: merged, reason: held ? 'merged' : 'complete'};
}
