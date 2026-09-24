import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FoodSheet } from '@/components/me/food-sheet';
import { PressableScale } from '@/components/pressable-scale';
import { ShineButton } from '@/components/shine-button';
import { Brand } from '@/constants/brand';
import { Accent, AppGutter, Spacing, Typeface } from '@/constants/theme';
import { foodFromLabel, LabelReadError, lookupBarcode, readLabel, type FoodItem, type LabelReading } from '@/lib/foods';
import { imageToBase64 } from '@/lib/photos';

type Mode = 'barcode' | 'label';
type Busy = null | 'lookup' | 'reading';
const BARCODES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

/**
 * Scan: point at a barcode for exact label data, or photograph the Nutrition Facts panel and have
 * the numbers read. Falls back to typing the barcode when there is no camera (simulator) or
 * permission was refused. Label photos are downscaled, sent, and never kept.
 */
export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'label' ? 'label' : 'barcode');
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [picked, setPicked] = useState<FoodItem | null>(null);
  const [manual, setManual] = useState('');
  const [reading, setReading] = useState<LabelReading | null>(null);
  const camera = useRef<CameraView>(null);
  const lastCode = useRef<{ code: string; at: number } | null>(null);
  // Simulators have no camera: offer typing and the photo library instead of a black preview.
  const simulator = !Device.isDevice;
  const cameraReady = !!permission?.granted && !simulator;
  // Refused for good (iOS only asks once) → Settings; not asked yet → ask.
  const blocked = permission?.status === 'denied' && !permission.canAskAgain;

  const lookup = async (code: string) => {
    if (busy) return;
    setBusy('lookup');
    setMessage(null);
    const food = await lookupBarcode(code).catch(() => null);
    setBusy(null);
    if (food) setPicked(food);
    else setMessage(`No product found for ${code}. Try the nutrition label instead — that reads any package.`);
  };

  const onBarcode = (result: BarcodeScanningResult) => {
    const code = result.data.replace(/\D/g, '');
    if (!code || busy || picked) return;
    const now = Date.now();
    if (lastCode.current && lastCode.current.code === code && now - lastCode.current.at < 4000) return;
    lastCode.current = { code, at: now };
    void lookup(code);
  };

  const readFrom = async (uri: string) => {
    setBusy('reading');
    setMessage(null);
    setReading(null);
    try {
      const b64 = await imageToBase64(uri, 1280);
      const r = await readLabel(b64);
      const food = foodFromLabel(r);
      setReading(r);
      if (!food) setMessage(r.readable ? 'The label was readable but had no calories line — try a sharper photo.' : 'That does not look like a nutrition label, or it is too blurry. Fill the frame with the panel and try again.');
      else setPicked(food);
    } catch (e) {
      setMessage(e instanceof LabelReadError ? e.message : 'Could not read the label. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  const snapLabel = async () => {
    if (!camera.current || busy) return;
    const photo = await camera.current.takePictureAsync({ quality: 0.9 }).catch(() => null);
    if (photo?.uri) await readFrom(photo.uri);
  };

  const pickLabel = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!res.canceled && res.assets[0]?.uri) await readFrom(res.assets[0].uri);
  };

  const frame = Math.min(width - AppGutter * 2, 340);

  return (
    <View style={styles.root}>
      {cameraReady ? (
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing="back"
          active={!picked}
          barcodeScannerSettings={mode === 'barcode' ? { barcodeTypes: [...BARCODES] } : undefined}
          onBarcodeScanned={mode === 'barcode' ? onBarcode : undefined}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noCamera]} />
      )}
      <View style={[styles.scrim, { paddingTop: insets.top + Spacing.one }]} pointerEvents="box-none">
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} style={styles.iconButton}>
            <SymbolView name="xmark" size={16} weight="bold" tintColor="#F5F5F7" fallback={null} />
          </PressableScale>
          <View style={styles.segment}>
            {(['barcode', 'label'] as Mode[]).map((m) => (
              <PressableScale
                key={m}
                onPress={() => {
                  setMode(m);
                  setMessage(null);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === m }}
                pressedScale={0.97}
                style={[styles.segmentItem, mode === m && styles.segmentItemOn]}>
                <SymbolView name={m === 'barcode' ? 'barcode.viewfinder' : 'doc.text.viewfinder'} size={14} weight="semibold" tintColor={mode === m ? Accent.primary : 'rgba(242,242,244,0.6)'} fallback={null} />
                <Text style={[styles.segmentText, mode === m && styles.segmentTextOn]}>{m === 'barcode' ? 'Barcode' : 'Nutrition label'}</Text>
              </PressableScale>
            ))}
          </View>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.center} pointerEvents="box-none">
          {cameraReady ? (
            <Animated.View key={mode} entering={FadeIn.duration(220)} style={[styles.frame, { width: frame, height: mode === 'barcode' ? frame * 0.6 : frame * 1.1 }]}>
              {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
                <View key={c} style={[styles.corner, styles[c]]} />
              ))}
              {busy ? (
                <View style={styles.busy}>
                  <ActivityIndicator color="#F5F5F7" />
                  <Text style={styles.busyText}>{busy === 'lookup' ? 'Looking it up…' : 'Reading the label…'}</Text>
                </View>
              ) : null}
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.fallback}>
              <View style={styles.fallbackIcon}>
                <SymbolView name={blocked ? 'camera.fill' : 'camera.metering.unknown'} size={26} weight="semibold" tintColor={Accent.primary} fallback={null} />
              </View>
              <Text style={styles.fallbackTitle}>{simulator ? 'No camera on the simulator' : blocked ? 'Camera access is off' : 'Camera permission'}</Text>
              <Text style={styles.fallbackText}>
                {simulator
                  ? 'Type a barcode to test the lookup, or choose a label photo from the library.'
                  : blocked
                    ? 'Allow the camera in Settings to scan barcodes and labels. You can still type a barcode below.'
                    : 'Pepmaxing needs the camera to scan barcodes and read nutrition labels. Nothing is recorded.'}
              </Text>
              {simulator ? null : (
                <View style={styles.fallbackAction}>
                  {blocked ? <ShineButton size="compact" label="Open Settings" onPress={() => void Linking.openSettings()} /> : <ShineButton size="compact" label="Allow camera" onPress={() => void requestPermission()} />}
                </View>
              )}
            </Animated.View>
          )}
        </View>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.three }]}>
          {message ? (
            <Animated.View entering={FadeInDown.duration(220)} style={styles.message}>
              <Text style={styles.messageText}>{message}</Text>
            </Animated.View>
          ) : null}
          {reading?.notes && picked ? null : reading?.notes && !message ? <Text style={styles.note}>{reading.notes}</Text> : null}
          {mode === 'barcode' ? (
            <View style={styles.manualRow}>
              <View style={styles.manualField}>
                <SymbolView name="number" size={14} weight="semibold" tintColor="rgba(242,242,244,0.5)" fallback={null} />
                <TextInput
                  value={manual}
                  onChangeText={(v) => setManual(v.replace(/\D/g, '').slice(0, 14))}
                  keyboardType="number-pad"
                  placeholder={cameraReady ? 'Or type the barcode' : 'Type the barcode'}
                  placeholderTextColor="rgba(242,242,244,0.4)"
                  returnKeyType="search"
                  onSubmitEditing={() => manual.length >= 8 && void lookup(manual)}
                  style={styles.manualInput}
                  accessibilityLabel="Barcode number"
                />
              </View>
              <PressableScale onPress={() => void lookup(manual)} disabled={manual.length < 8 || !!busy} accessibilityRole="button" accessibilityLabel="Look up barcode" style={[styles.go, (manual.length < 8 || !!busy) && styles.goOff]}>
                <SymbolView name="arrow.right" size={15} weight="bold" tintColor="#0B0F0D" fallback={null} />
              </PressableScale>
            </View>
          ) : (
            <View style={styles.labelActions}>
              {cameraReady ? (
                <PressableScale onPress={() => void snapLabel()} disabled={!!busy} accessibilityRole="button" accessibilityLabel="Take a photo of the label" style={styles.shutterWrap}>
                  <View style={styles.shutter} />
                </PressableScale>
              ) : null}
              <PressableScale onPress={() => void pickLabel()} disabled={!!busy} accessibilityRole="button" accessibilityLabel="Choose a label photo from the library" style={styles.library}>
                <SymbolView name="photo.on.rectangle" size={16} weight="semibold" tintColor="#F5F5F7" fallback={null} />
                <Text style={styles.libraryText}>From library</Text>
              </PressableScale>
            </View>
          )}
          <Text style={styles.hint}>{mode === 'barcode' ? 'Exact numbers from the package label — USDA and Open Food Facts.' : 'Fill the frame with the Nutrition Facts panel. The photo is read once and never stored.'}</Text>
        </View>
      </View>

      <FoodSheet
        food={picked}
        onClose={() => {
          setPicked(null);
          setReading(null);
        }}
      />
    </View>
  );
}

const CORNER = 26;
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  noCamera: { backgroundColor: Brand.black },
  scrim: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: AppGutter, gap: Spacing.two },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', padding: 3, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  segmentItem: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 11 },
  segmentItemOn: { backgroundColor: 'rgba(52,211,153,0.18)' },
  segmentText: { color: 'rgba(242,242,244,0.7)', fontFamily: Typeface.bodySemiBold, fontSize: 13 },
  segmentTextOn: { color: Accent.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: AppGutter },
  frame: { position: 'relative' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: Accent.primary, borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
  busy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 12 },
  busyText: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 14 },
  fallback: { alignItems: 'center', gap: Spacing.two, padding: Spacing.four, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', alignSelf: 'stretch' },
  fallbackIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(52,211,153,0.12)', alignItems: 'center', justifyContent: 'center' },
  fallbackTitle: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 21, letterSpacing: -0.5, textAlign: 'center' },
  fallbackText: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.body, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: Spacing.one },
  fallbackAction: { alignSelf: 'stretch', alignItems: 'center', marginTop: Spacing.one },
  bottom: { paddingHorizontal: AppGutter, gap: Spacing.two, experimental_backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0.9) 100%)', paddingTop: Spacing.five },
  message: { padding: Spacing.three, borderRadius: 16, backgroundColor: 'rgba(251,191,36,0.14)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(251,191,36,0.4)' },
  messageText: { color: '#FDE68A', fontFamily: Typeface.bodyMedium, fontSize: 13.5, lineHeight: 19 },
  note: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.body, fontSize: 12.5 },
  manualRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  manualField: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  manualInput: { flex: 1, color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 16, fontVariant: ['tabular-nums'], paddingVertical: 0 },
  go: { width: 48, height: 48, borderRadius: 24, backgroundColor: Accent.primary, alignItems: 'center', justifyContent: 'center' },
  goOff: { opacity: 0.35 },
  labelActions: { alignItems: 'center', gap: Spacing.two },
  shutterWrap: { width: 74, height: 74, borderRadius: 37, borderWidth: 3, borderColor: '#F5F5F7', alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F5F5F7' },
  library: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)' },
  libraryText: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 13.5 },
  hint: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 12.5, lineHeight: 17, textAlign: 'center' },
});
