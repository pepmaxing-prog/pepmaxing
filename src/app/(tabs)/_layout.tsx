import { Tabs } from 'expo-router/js-tabs';

import { FloatingTabBar } from '@/components/home/floating-tab-bar';
import { Toasts } from '@/components/home/toasts';
import { Brand } from '@/constants/brand';

/** The app proper: four tabs behind a floating pill; the "+" overlay lives inside the tab bar. */
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
      <Toasts />
    </>
  );
}
