import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { Colors, Spacing, Typeface } from '@/constants/theme';

/** Dark surface used for every grouped block in the app. */
export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

export function CardTitle({ children }: { children: string }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <Card style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: Spacing.four,
  },
  title: {
    color: Colors.dark.text,
    fontFamily: Typeface.bodySemiBold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  sectionLabel: {
    color: Colors.dark.textTertiary,
    fontFamily: Typeface.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  emptyTitle: { color: Colors.dark.text, fontFamily: Typeface.bodySemiBold, fontSize: 16 },
  emptyDetail: {
    color: Colors.dark.textSecondary,
    fontFamily: Typeface.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
