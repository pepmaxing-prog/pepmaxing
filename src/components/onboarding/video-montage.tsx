import { useVideoPlayer, VideoView, type VideoPlayer, type VideoSource } from 'expo-video';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

/** Seconds of each clip shown before the next one starts fading in; keep HOLD + FADE under the shortest clip. */
const HOLD_MS = 4800;
const FADE_MS = 1000;

type Props = {
  clips: VideoSource[];
};

type Role = 'current' | 'previous' | 'hidden';

/**
 * Full-bleed, muted, looping montage: one preloaded player per clip, stacked, with the incoming
 * clip fading in over the outgoing one so each cut is a cross-dissolve. Players are never
 * re-sourced (swapping sources races `play()` on iOS); the next clip is simply replayed.
 */
export function VideoMontage({ clips }: Props) {
  const [step, setStep] = useState({ current: 0, previous: -1 });

  useEffect(() => {
    if (clips.length < 2) return;
    const timer =
      step.previous >= 0
        ? setTimeout(() => setStep({ current: step.current, previous: -1 }), FADE_MS)
        : setTimeout(() => setStep({ current: (step.current + 1) % clips.length, previous: step.current }), HOLD_MS);
    return () => clearTimeout(timer);
  }, [step, clips.length]);

  // Later siblings paint on top: hidden layers first, then the outgoing clip, then the incoming one.
  const roleOf = (i: number): Role => (i === step.current ? 'current' : i === step.previous ? 'previous' : 'hidden');
  const order = clips.map((_, i) => i).sort((a, b) => RANK[roleOf(a)] - RANK[roleOf(b)]);

  return (
    <>
      {order.map((i) => (
        <Layer key={i} source={clips[i]} role={roleOf(i)} />
      ))}
    </>
  );
}

const RANK: Record<Role, number> = { hidden: 0, previous: 1, current: 2 };

function Layer({ source, role }: { source: VideoSource; role: Role }) {
  const reducedMotion = useReducedMotion();
  const player = useVideoPlayer(source, (p: VideoPlayer) => {
    p.muted = true;
    p.loop = false;
    p.audioMixingMode = 'mixWithOthers';
    p.timeUpdateEventInterval = 0;
  });
  const opacity = useSharedValue(role === 'current' ? 1 : 0);

  useEffect(() => {
    if (role === 'current') {
      player.replay();
      opacity.set(withTiming(1, { duration: reducedMotion ? 0 : FADE_MS, easing: Easing.inOut(Easing.quad) }));
    } else if (role === 'hidden') {
      player.pause();
      opacity.set(0);
    }
  }, [role, player, opacity, reducedMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View style={[styles.fill, style]}>
      <VideoView player={player} style={styles.fill} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' },
});
