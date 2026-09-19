import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, type ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withTiming, ZoomIn, ZoomOut } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { Accent, Spacing, Typeface } from '@/constants/theme';

const SURFACE = 'rgba(255,255,255,0.045)';
const SURFACE_ON = 'rgba(52,211,153,0.08)';
const BORDER = 'rgba(255,255,255,0.09)';
const DISC = 'rgba(52,211,153,0.12)';
/** Dark ink used on top of the accent, as in the protocol demo's check. */
export const ON_ACCENT = '#04140D';

const select = { duration: 240, easing: Easing.out(Easing.cubic) } as const;

type Entering = ComponentProps<typeof Animated.View>['entering'];

/** Animated styles for a selectable surface: emerald border/tint, and a disc that fills solid. */
function useSelection(selected: boolean) {
  const on = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    on.set(withTiming(selected ? 1 : 0, select));
  }, [selected, on]);

  const surface = useAnimatedStyle(() => ({
    borderColor: interpolateColor(on.get(), [0, 1], [BORDER, Accent.primary]),
    backgroundColor: interpolateColor(on.get(), [0, 1], [SURFACE, SURFACE_ON]),
  }));
  const disc = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.get(), [0, 1], [DISC, Accent.primary]),
  }));
  // Hollow outline that fills solid — reads as a checkbox on list rows.
  const ring = useAnimatedStyle(() => ({
    borderColor: interpolateColor(on.get(), [0, 1], ['rgba(255,255,255,0.24)', Accent.primary]),
    backgroundColor: interpolateColor(on.get(), [0, 1], ['rgba(52,211,153,0)', Accent.primary]),
  }));
  const idle = useAnimatedStyle(() => ({ opacity: 1 - on.get() }));
  const active = useAnimatedStyle(() => ({ opacity: on.get() }));
  return { surface, disc, ring, idle, active };
}

function CheckBadge() {
  return (
    <Animated.View entering={ZoomIn.springify().damping(14).stiffness(260)} exiting={ZoomOut.duration(140)} style={styles.badge}>
      <SymbolView name="checkmark" size={11} weight="bold" tintColor={ON_ACCENT} fallback={<View style={styles.badgeFallback} />} />
    </Animated.View>
  );
}

type CardProps = {
  /** Omit for a text-only card. */
  symbol?: SFSymbol;
  label: string;
  caption?: string;
  selected: boolean;
  width: number;
  height: number;
  /** Smaller disc and type for short screens. */
  compact?: boolean;
  onPress: () => void;
  entering?: Entering;
  accessibilityRole?: 'checkbox' | 'radio';
};

/** Grid card: tinted icon disc, label and an optional caption; the disc fills and a check springs in when selected. */
export function ChoiceCard({ symbol, label, caption, selected, width, height, compact = false, onPress, entering, accessibilityRole = 'checkbox' }: CardProps) {
  const { surface, disc, idle, active } = useSelection(selected);
  const discSize = compact ? 40 : 46;
  const icon = compact ? 19 : 22;

  return (
    <Animated.View entering={entering}>
      <PressableScale
        onPress={onPress}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityRole === 'radio' ? { selected } : { checked: selected }}
        accessibilityLabel={caption ? `${label}. ${caption.replace('\n', ' ')}` : label}
        style={[styles.card, { width, height }]}>
        <Animated.View style={[styles.surface, surface]} />
        {symbol ? (
          <Animated.View style={[styles.disc, { width: discSize, height: discSize, borderRadius: discSize / 2 }, disc]}>
            <Animated.View style={[styles.layer, idle]}>
              <SymbolView name={symbol} size={icon} weight="semibold" tintColor={Accent.primary} fallback={<View style={[styles.iconFallback, { backgroundColor: Accent.primary }]} />} />
            </Animated.View>
            <Animated.View style={[styles.layer, active]}>
              <SymbolView name={symbol} size={icon} weight="semibold" tintColor={ON_ACCENT} fallback={<View style={[styles.iconFallback, { backgroundColor: ON_ACCENT }]} />} />
            </Animated.View>
          </Animated.View>
        ) : null}
        <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {label}
        </Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        {selected && symbol ? <CheckBadge /> : null}
      </PressableScale>
    </Animated.View>
  );
}

type RowProps = {
  label: string;
  selected: boolean;
  compact?: boolean;
  onPress: () => void;
  entering?: Entering;
};

/** Full-width checklist row with a leading ring that fills with a check when selected. */
export function ChoiceRow({ label, selected, compact = false, onPress, entering }: RowProps) {
  const { surface, ring, active } = useSelection(selected);

  return (
    <Animated.View entering={entering}>
      <PressableScale
        onPress={onPress}
        pressedScale={0.985}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        style={[styles.row, { height: compact ? 40 : 54 }]}>
        <Animated.View style={[styles.surface, styles.rowSurface, surface]} />
        <View style={styles.ring}>
          <Animated.View style={[styles.ringFill, ring]} />
          <Animated.View style={[styles.layer, active]}>
            <SymbolView name="checkmark" size={11} weight="bold" tintColor={ON_ACCENT} fallback={<View style={styles.badgeFallback} />} />
          </Animated.View>
        </View>
        <Text style={styles.rowLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {label}
        </Text>
      </PressableScale>
    </Animated.View>
  );
}

/** The muted hint under a step title ("Pick as many as you like."). */
export const hintStyle = {
  marginTop: Spacing.two + Spacing.half,
  color: 'rgba(242,242,244,0.5)',
  fontFamily: Typeface.body,
  fontSize: 16,
  lineHeight: 20,
  letterSpacing: -0.2,
} as const;

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  surface: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two + Spacing.half,
  },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  iconFallback: { width: 18, height: 18, borderRadius: 9 },
  label: {
    color: '#F2F2F4',
    fontFamily: Typeface.bodySemiBold,
    fontSize: 15,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  caption: {
    marginTop: Spacing.half + 1,
    color: 'rgba(242,242,244,0.48)',
    fontFamily: Typeface.body,
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.1,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeFallback: { width: 8, height: 8, borderRadius: 4, backgroundColor: ON_ACCENT },
  row: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.three - Spacing.one,
  },
  rowSurface: { borderRadius: 16 },
  ring: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  ringFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 11, borderWidth: 1.5 },
  rowLabel: {
    flex: 1,
    color: '#F2F2F4',
    fontFamily: Typeface.bodyMedium,
    fontSize: 15.5,
    letterSpacing: -0.2,
  },
});
