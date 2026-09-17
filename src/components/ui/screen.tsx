import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { BottomTabInset, Colors, Spacing, Typeface } from '@/constants/theme';

/** Standard scrollable tab screen: large title, safe-area aware, tab-bar clearance. */
export function Screen({
  title,
  subtitle,
  children,
  scrollable = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  scrollable?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const content = (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </>
  );

  const padding = {
    paddingTop: insets.top + Spacing.three,
    paddingBottom: insets.bottom + BottomTabInset + Spacing.five,
  };

  if (!scrollable) {
    return <View style={[styles.root, styles.body, padding]}>{content}</View>;
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.body, padding]}
      showsVerticalScrollIndicator={false}>
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  body: { paddingHorizontal: Spacing.four, gap: Spacing.four },
  header: { gap: Spacing.one },
  title: {
    color: Colors.dark.text,
    fontFamily: Typeface.display,
    fontSize: 32,
    letterSpacing: -1,
  },
  subtitle: { color: Colors.dark.textSecondary, fontFamily: Typeface.body, fontSize: 15 },
});
