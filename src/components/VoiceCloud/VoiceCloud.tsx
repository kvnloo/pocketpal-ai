import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {useReducedMotion} from 'react-native-reanimated';
import Svg, {Circle, Line} from 'react-native-svg';
import {MODE_FRAMES, resolvePreset, type OrbState} from 'thinking-orbs/engine';

import {useTheme} from '../../hooks';

import type {VoiceVisual} from './visual';

/** The orbs are hand-tuned at 64 px; the SVG viewBox scales them up. */
const DESIGN = 64;
const FPS = 24;

const ORB: Record<VoiceVisual | 'still', OrbState> = {
  listening: 'listening',
  thinking: 'working',
  speaking: 'composing',
  muted: 'breathing',
  still: 'breathing',
};

interface VoiceCloudProps {
  visual: VoiceVisual | 'still';
  size: number;
}

/**
 * The voice-mode thinking orb (thinking-orbs): a rolling waveform while
 * listening, orbiting particles while thinking, an undulating sash while
 * speaking. Muted and still show a resting ring without motion.
 */
export const VoiceCloud: React.FC<VoiceCloudProps> = ({visual, size}) => {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const animate = !reduceMotion && visual !== 'muted' && visual !== 'still';
  const preset = useMemo(() => resolvePreset(ORB[visual], DESIGN), [visual]);
  const [t, setT] = useState(0);

  useEffect(() => {
    setT(0);
    if (!animate) {
      return;
    }
    const started = Date.now();
    const timer = setInterval(
      () => setT(((Date.now() - started) / 1000) * preset.speed),
      1000 / FPS,
    );
    return () => clearInterval(timer);
  }, [animate, preset]);

  const frame = MODE_FRAMES[preset.mode](DESIGN, t, preset.opts);
  const ink =
    visual === 'muted' ? theme.colors.onSurfaceVariant : theme.colors.primary;
  // Ink 0 is the strongest mark; near dots read strongest on either theme.
  const opacity = (white: number, a = 1) => a * (0.25 + 0.75 * (1 - white));

  return (
    <View
      style={[{width: size, height: size}, visual === 'muted' && styles.muted]}
      testID={`voice-cloud-${visual}`}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${DESIGN} ${DESIGN}`}
        testID={`voice-orb-${preset.mode}`}>
        {frame.lines.map((l, i) => (
          <Line
            key={`l${i}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={ink}
            strokeWidth={l.w}
            strokeOpacity={opacity(l.white, l.a)}
          />
        ))}
        {frame.dots.map((d, i) => (
          <Circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={d.r}
            fill={ink}
            fillOpacity={opacity(d.white, d.a)}
          />
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  muted: {
    opacity: 0.5,
  },
});
