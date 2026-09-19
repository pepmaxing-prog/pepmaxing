import { Tabs } from 'expo-router/js-tabs';

import { FloatingTabBar } from '@/components/home/floating-tab-bar';
import { QuickActionsSheet } from '@/components/home/quick-actions-sheet';
import { Brand } from '@/constants/brand';

/** The app proper: four tabs behind a floating pill, plus the "+" quick-actions sheet. */
export default function TabsLayout() {
  return (
    <>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: Brand.black }, animation: 'fade' }}>
        <Tabs.Screen name="home" options={{ title: 'Home' }} />
        <Tabs.Screen name="library" options={{ title: 'Library' }} />
        <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
        <Tabs.Screen name="me" options={{ title: 'Me' }} />
      </Tabs>
      <QuickActionsSheet />
    </>
  );
}
