import React from 'react';
import {act} from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';

import {render} from '../../../../jest/test-utils';

import {VoiceCloud} from '../VoiceCloud';
import {voiceVisual} from '../visual';

describe('voiceVisual', () => {
  it.each([
    ['listening', false, 'listening'],
    ['listening', true, 'muted'],
    ['transcribing', false, 'thinking'],
    ['thinking', true, 'thinking'],
    ['speaking', false, 'speaking'],
    ['speaking', true, 'speaking'],
  ] as const)('%s, muted %s → %s', (phase, muted, visual) => {
    expect(voiceVisual(phase, muted)).toBe(visual);
  });
});

describe('VoiceCloud', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const firstDot = (root: ReturnType<typeof render>) =>
    JSON.stringify(root.toJSON()).match(/"cx":[-0-9.e]+/)?.[0];

  it.each([
    ['listening', 'wave'],
    ['thinking', 'orbits'],
    ['speaking', 'ribbon'],
    ['muted', 'ring'],
  ] as const)('renders the %s orb', (visual, mode) => {
    const {getByTestId} = render(<VoiceCloud visual={visual} size={280} />);
    expect(getByTestId(`voice-cloud-${visual}`)).toBeTruthy();
    expect(getByTestId(`voice-orb-${mode}`)).toBeTruthy();
  });

  it('moves while listening and stops when it goes away', () => {
    const root = render(<VoiceCloud visual="listening" size={280} />);
    const before = firstDot(root);
    act(() => jest.advanceTimersByTime(500));
    expect(firstDot(root)).not.toBe(before);
    root.unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('stays still when muted', () => {
    render(<VoiceCloud visual="muted" size={280} />);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('stays still, in colour, as a still orb', () => {
    const {getByTestId} = render(<VoiceCloud visual="still" size={280} />);
    expect(jest.getTimerCount()).toBe(0);
    expect(getByTestId('voice-cloud-still')).not.toHaveStyle({opacity: 0.5});
  });

  it('stays still when the system asks for reduced motion', () => {
    (Reanimated.useReducedMotion as jest.Mock).mockReturnValueOnce(true);
    render(<VoiceCloud visual="speaking" size={280} />);
    expect(jest.getTimerCount()).toBe(0);
  });
});
