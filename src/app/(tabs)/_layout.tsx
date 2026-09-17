import { Tabs } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Colors, Typeface } from '@/constants/theme';

function TabIcon({ symbol, focused }: { symbol: SFSymbol; focused: boolean }) {
  const color = focused ? Colors.dark.text : Colors.dark.textTertiary;
  return (
    <SymbolView
      name={symbol}
      size={24}
      tintColor={color}
      weight={focused ? 'semibold' : 'medium'}
      fallback={<View style={[styles.fallback, { backgroundColor: color }]} />}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.dark.text,
        tabBarInactiveTintColor: Colors.dark.textTertiary,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        sceneStyle: { backgroundColor: Colors.dark.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => <TabIcon symbol="bolt.heart" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => <TabIcon symbol="list.bullet.rectangle" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'rgba(8,8,10,0.94)',
    borderTopColor: Colors.dark.border,
  },
  label: { fontFamily: Typeface.bodyMedium, fontSize: 11 },
  fallback: { width: 20, height: 20, borderRadius: 10 },
});
