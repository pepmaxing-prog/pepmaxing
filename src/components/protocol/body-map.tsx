import { Canvas, Circle, Group } from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Accent, Typeface } from '@/constants/theme';
import { pointFor, SITES, type Figure, type Kind, type SiteId, type SiteView } from '@/lib/sites';

/** The illustrations are 500 × 1100 (a 100 × 220 box); points are fractions of that box. */
const BOX_W = 100;
const BOX_H = 220;
export const BODY_ASPECT = BOX_H / BOX_W;
export const SUGGEST_COLOR = '#A78BFA';
const RECENT_COLOR = '#FBBF24';
const HIT = 40;

type Props = {
  view: SiteView;
  figure: Figure;
  width: number;
  /** Which sites are appropriate for this injection; the rest are drawn faint and inert. */
  kind: Kind;
  selected: SiteId | null;
  suggested?: SiteId | null;
  /** Sites used in the last week — marked so the rotation is visible at a glance. */
  recent?: ReadonlySet<SiteId>;
  onSelect?: (id: SiteId) => void;
  /** Read-only thumbnail: only the selected and recent points are drawn, nothing is tappable. */
  compact?: boolean;
};

const ART: Record<Figure, Record<SiteView, number>> = {
  male: { front: require('@/assets/body/male-front.png'), back: require('@/assets/body/male-back.png') },
  female: { front: require('@/assets/body/female-front.png'), back: require('@/assets/body/female-back.png') },
};

/**
 * An anatomical figure (male or female, front or back) with one marker per injection point.
 * Markers are Skia; hit targets and the label pill are plain views laid over the same points.
 */
export function BodyMap({ view, figure, width, kind, selected, suggested, recent, onSelect, compact }: Props) {
  const height = width * BODY_ASPECT;
  const k = width / BOX_W;
  const sites = SITES.filter((s) => s.view === view && (!compact || s.id === selected || recent?.has(s.id)));
  const at = (id: SiteId) => {
    const p = pointFor(id, figure);
    return { x: p.x * BOX_W * k, y: p.y * BOX_H * k };
  };
  const r = compact ? Math.max(3, width * 0.04) : Math.max(6, width * 0.028);

  return (
    <View style={{ width, height }} accessible={false}>
      <Image source={ART[figure][view]} style={{ width, height }} contentFit="contain" transition={200} accessibilityIgnoresInvertColors />
      <Canvas style={[styles.overlay, { width, height }]}>
        {sites.map((s) => {
          const eligible = s.kinds.includes(kind);
          const isSelected = selected === s.id;
          const isSuggested = suggested === s.id && !isSelected;
          const isRecent = !!recent?.has(s.id);
          const { x, y } = at(s.id);
          const color = isSelected ? Accent.primary : isSuggested ? SUGGEST_COLOR : isRecent ? RECENT_COLOR : eligible ? 'rgba(52,211,153,0.85)' : 'rgba(255,255,255,0.28)';
          const halo = isSelected ? `${Accent.primary}55` : isSuggested ? `${SUGGEST_COLOR}55` : 'rgba(0,0,0,0)';
          return (
            <Group key={s.id}>
              {isSelected || isSuggested ? <Circle cx={x} cy={y} r={r * 2} color={halo} /> : null}
              <Circle cx={x} cy={y} r={r} color={eligible ? 'rgba(14,18,16,0.55)' : 'rgba(14,18,16,0.25)'} />
              <Circle cx={x} cy={y} r={r} color={color} style="stroke" strokeWidth={isSelected || isSuggested ? 2 : 1.5} />
              <Circle cx={x} cy={y} r={isSelected || isSuggested ? r * 0.5 : isRecent ? r * 0.42 : r * 0.3} color={eligible || isRecent ? color : 'rgba(255,255,255,0.35)'} />
            </Group>
          );
        })}
      </Canvas>
      {compact ? null : sites.map((s) => {
        const eligible = s.kinds.includes(kind);
        const isSelected = selected === s.id;
        const isSuggested = suggested === s.id && !isSelected;
        const { x, y } = at(s.id);
        const labelled = isSelected || isSuggested;
        // The pill sits beside the marker on the outer side of the body, where no other markers are.
        const outerLeft = x < width / 2;
        return (
          <Pressable
            key={s.id}
            disabled={!eligible}
            onPress={() => onSelect?.(s.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled: !eligible }}
            accessibilityLabel={s.label}
            accessibilityHint={isSuggested ? 'Suggested for this dose' : recent?.has(s.id) ? 'Used in the last week' : undefined}
            style={[styles.hit, { left: x - HIT / 2, top: y - HIT / 2 }]}>
            {labelled ? (
              <View style={[styles.pill, outerLeft ? { right: HIT / 2 + r + 4 } : { left: HIT / 2 + r + 4 }, isSelected ? styles.pillOn : styles.pillSuggested]}>
                <Text style={[styles.label, isSelected ? styles.labelOn : styles.labelSuggested]} numberOfLines={1}>
                  {s.short}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0 },
  hit: { position: 'absolute', width: HIT, height: HIT, alignItems: 'center' },
  pill: { position: 'absolute', top: HIT / 2 - 10, width: 88, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(14,18,16,0.94)', borderWidth: StyleSheet.hairlineWidth },
  pillOn: { borderColor: 'rgba(52,211,153,0.7)' },
  pillSuggested: { borderColor: 'rgba(167,139,250,0.7)' },
  label: { textAlign: 'center', fontFamily: Typeface.bodySemiBold, fontSize: 10.5, letterSpacing: 0.1 },
  labelOn: { color: Accent.primary },
  labelSuggested: { color: SUGGEST_COLOR },
});
