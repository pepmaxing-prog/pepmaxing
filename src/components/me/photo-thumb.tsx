import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { localUri, photosStore, usePhotos } from '@/lib/photos';

/**
 * Shows a progress photo from the local file, downloading it from the account first when this
 * device has never had it (new phone). Renders a quiet placeholder while that happens.
 */
type Box = { width: number; height: number; borderRadius?: number };

export function PhotoThumb({ id, style, contentFit = 'cover' }: { id: string; style?: Box; contentFit?: 'cover' | 'contain' }) {
  usePhotos(); // re-render when the store emits (e.g. after a download lands)
  const uri = localUri(id);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (uri || failed) return;
    let cancelled = false;
    void photosStore.ensureLocal(id).then((got) => {
      if (!cancelled && !got) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [id, uri, failed]);
  if (uri) return <Image source={{ uri }} style={[styles.image, style]} contentFit={contentFit} transition={200} />;
  return (
    <View style={[styles.image, styles.placeholder, style]}>
      {failed ? <SymbolView name="icloud.slash" size={18} weight="medium" tintColor="rgba(242,242,244,0.4)" fallback={null} /> : <ActivityIndicator size="small" color="rgba(242,242,244,0.5)" />}
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: 'rgba(255,255,255,0.06)' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
