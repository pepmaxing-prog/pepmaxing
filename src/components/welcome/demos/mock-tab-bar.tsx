import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { Typeface } from '@/constants/theme';

import { Demo } from './shared';

const TABS: { label: string; symbol: SFSymbol }[] = [
  { label: 'Today', symbol: 'calendar' },
  { label: 'Protocols', symbol: 'list.bullet.rectangle' },
  { label: 'Log', symbol: 'plus.circle.fill' },
  { label: 'Library', symbol: 'books.vertical' },
  { label: 'Assistant', symbol: 'sparkles' },
];

/** The app's tab bar, as it will look — anchors every demo screen. */
export function MockTabBar({ active }: { active: number }) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab, i) => {
        const isActive = i === active;
        const color = isActive ? Demo.text : Demo.faint;
        return (
          <View key={tab.label} style={styles.tab}>
            <SymbolView
              name={tab.symbol}
              size={i === 2 ? 26 : 21}
              tintColor={color}
              weight="medium"
              fallback={<View style={[styles.fallback, { backgroundColor: color }]} />}
            />
            {i !== 2 && <Text style={[styles.label, { color }]}>{tab.label}</Text>}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 78,
    paddingTop: 10,
    paddingBottom: 22,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: Demo.border,
    backgroundColor: 'rgba(8,8,10,0.92)',
  },
  tab: { width: 52, alignItems: 'center', gap: 4 },
  label: { fontFamily: Typeface.bodyMedium, fontSize: 9.5, letterSpacing: 0.1 },
  fallback: { width: 18, height: 18, borderRadius: 9 },
});
