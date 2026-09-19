import { StyleSheet, View } from 'react-native';

import { VideoMontage } from '@/components/onboarding/video-montage';

/** Generated for the sign-in screens (see scripts/transcode-clip.swift); 720x1280, ~6 s, silent. */
const CLIPS = [
  require('@/assets/video/signin-walk.mp4'),
  require('@/assets/video/signin-coffee.mp4'),
  require('@/assets/video/signin-stretch.mp4'),
  require('@/assets/video/signin-breakfast.mp4'),
];

/** The looping lifestyle montage with the scrims that keep the header and copy legible. */
export function SignInBackdrop({ firstClip = 0 }: { firstClip?: number }) {
  const clips = [...CLIPS.slice(firstClip), ...CLIPS.slice(0, firstClip)];
  return (
    <>
      <VideoMontage clips={clips} />
      <View style={styles.scrimTop} />
      <View style={styles.scrimBottom} />
    </>
  );
}

const styles = StyleSheet.create({
  scrimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    experimental_backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)',
  },
  scrimBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '68%',
    experimental_backgroundImage:
      'linear-gradient(180deg, rgba(3,10,7,0) 0%, rgba(3,10,7,0.45) 30%, rgba(3,10,7,0.86) 58%, rgba(3,10,7,0.97) 100%)',
  },
});
