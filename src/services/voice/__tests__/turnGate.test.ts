import {decideTurn} from '../turnGate';

describe('decideTurn', () => {
  it('ignores silence, annotations and Whisper hallucinations', () => {
    expect(decideTurn('').action).toBe('ignore');
    expect(decideTurn('[BLANK_AUDIO]').action).toBe('ignore');
    expect(decideTurn('Thank you for watching.').action).toBe('ignore');
    expect(decideTurn('Um, uh.').action).toBe('ignore');
  });

  it('ignores backchannels only when said over the assistant', () => {
    expect(decideTurn('Okay.', {overAssistant: true}).action).toBe('ignore');
    expect(decideTurn('Okay.').action).toBe('send');
  });

  it('holds an unfinished sentence and merges the rest', () => {
    const first = decideTurn('So I was thinking and');
    expect(first).toMatchObject({
      action: 'hold',
      text: 'So I was thinking and',
    });
    expect(decideTurn('we should go.', {held: first.text})).toEqual({
      action: 'send',
      text: 'So I was thinking and we should go.',
      reason: 'merged',
    });
  });

  it('sends held text when the next utterance is empty', () => {
    expect(decideTurn('', {held: 'tell me about'})).toMatchObject({
      action: 'send',
      text: 'tell me about',
    });
  });

  it('sends a finished question', () => {
    expect(decideTurn('What time is it?').action).toBe('send');
  });
});
