import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

type Props = { size: number; color: string; filled?: boolean; strokeWidth?: number };

/**
 * The assistant's mark: a rounded speech bubble with a short tail and a four-point spark inside.
 * Drawn in a 24 × 24 box and scaled, so it stays crisp at any size. Outline when idle, filled
 * (with the spark cut out) when the tab is active.
 */
export function ChatGlyph({ size, color, filled = false, strokeWidth = 1.7 }: Props) {
  const k = size / 24;
  const { bubble, spark } = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    // Bubble body: rounded rect from (2.5,3.5) to (21.5,17.5), radius 5.5, with a tail at bottom-left.
    b.moveTo(8, 3.5)
      .lineTo(16, 3.5)
      .cubicTo(19.04, 3.5, 21.5, 5.96, 21.5, 9)
      .lineTo(21.5, 12)
      .cubicTo(21.5, 15.04, 19.04, 17.5, 16, 17.5)
      .lineTo(9.6, 17.5)
      .lineTo(5.6, 21.1)
      .cubicTo(5.1, 21.55, 4.3, 21.2, 4.3, 20.5)
      .lineTo(4.3, 16.6)
      .cubicTo(3.2, 15.6, 2.5, 13.9, 2.5, 12)
      .lineTo(2.5, 9)
      .cubicTo(2.5, 5.96, 4.96, 3.5, 8, 3.5)
      .close();
    const s = Skia.PathBuilder.Make();
    // Four-point spark centred at (12,10.5), radius 3.6, pinched with curves through the centre.
    const cx = 12, cy = 10.5, r = 3.6, p = 0.62;
    s.moveTo(cx, cy - r)
      .quadTo(cx + p, cy - p, cx + r, cy)
      .quadTo(cx + p, cy + p, cx, cy + r)
      .quadTo(cx - p, cy + p, cx - r, cy)
      .quadTo(cx - p, cy - p, cx, cy - r)
      .close();
    return { bubble: b.build(), spark: s.build() };
  }, []);

  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={[{ scale: k }]}>
        {filled ? (
          <>
            <Path path={bubble} color={color} />
            <Path path={spark} color="#000000" blendMode="dstOut" />
          </>
        ) : (
          <>
            <Path path={bubble} color={color} style="stroke" strokeWidth={strokeWidth} strokeJoin="round" />
            <Path path={spark} color={color} />
          </>
        )}
      </Group>
    </Canvas>
  );
}
