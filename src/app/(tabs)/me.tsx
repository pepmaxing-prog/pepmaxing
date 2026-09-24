import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useCallback } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT } from '@/components/home/floating-tab-bar';
import { NutritionSection } from '@/components/me/nutrition-section';
import { ProgressSection } from '@/components/me/progress-section';
import { StackSection } from '@/components/me/stack-section';
import { PressableScale } from '@/components/pressable-scale';
import { StageBackground } from '@/components/stage/stage-background';
import { Brand } from '@/constants/brand';
import { Accent, AppGutter, Spacing, Typeface } from '@/constants/theme';
import { ME_SECTIONS, meSection, useMeSection } from '@/lib/me-section';
import { displayName, useOnboarding } from '@/lib/onboarding-store';
import { AVATAR_TINTS, AVATARS, levelFor, usePreferences } from '@/lib/preferences';
import { loggedCount, useSchedule } from '@/lib/schedule';

/**
 * Me: the user's own data — progress metrics, nutrition, the stack (protocols + vials) and
 * community. The section is chosen from the bottom bar, which turns into the Me bar while this
 * tab is focused (see `FloatingTabBar`); the screen only shows the header and the section.
 */
export default function MeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { name } = useOnboarding();
  const prefs = usePreferences();
  const schedule = useSchedule();
  const section = useMeSection();
  const title = ME_SECTIONS.find((s) => s.id === section)?.label ?? 'Me';
  // Every visit to Me starts on Nutrition; the bar's sections only switch within a visit.
  useFocusEffect(
    useCallback(() => {
      meSection.set('nutrition');
    }, []),
  );
  const contentWidth = width - AppGutter * 2;
  const { level } = levelFor(loggedCount(schedule));
  const avatarIndex = Math.max(0, (AVATARS as readonly string[]).indexOf(prefs.avatar));
  const tint = AVATAR_TINTS[avatarIndex % AVATAR_TINTS.length];
  const first = displayName(name);

  return (
    <View style={styles.root}>
      <StageBackground width={width} height={height} center={{ x: width / 2, y: height * 0.15 }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + Spacing.three, paddingBottom: TAB_BAR_HEIGHT + Math.max(insets.bottom, Spacing.two) + Spacing.five }}>
        <Animated.View entering={FadeIn.duration(360)} style={styles.header}>
          <PressableScale onPress={() => router.push('/settings/profile')} accessibilityRole="button" accessibilityLabel="Community profile" pressedScale={0.97} style={styles.profile}>
            <View style={[styles.avatar, { backgroundColor: `${tint}26`, borderColor: `${tint}66` }]}>
              <SymbolView name={prefs.avatar as SFSymbol} size={22} weight="semibold" tintColor={tint} fallback={null} />
            </View>
            <View style={styles.profileText}>
              <Text style={styles.name} numberOfLines={1}>
                {first || prefs.username}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {prefs.username} · {level.name}
              </Text>
            </View>
          </PressableScale>
          <PressableScale onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Settings" hitSlop={8} style={styles.iconButton}>
            <SymbolView name="gearshape" size={24} weight="medium" tintColor="rgba(242,242,244,0.85)" fallback={null} />
          </PressableScale>
        </Animated.View>

        <Animated.View key={section} entering={FadeInDown.duration(260)} style={styles.body}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {title}
          </Text>
          {section === 'progress' ? <ProgressSection width={contentWidth} /> : null}
          {section === 'nutrition' ? <NutritionSection width={contentWidth} /> : null}
          {section === 'stack' ? <StackSection /> : null}
          {section === 'community' ? <Community /> : null}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function Community() {
  return (
    <View style={styles.community}>
      <View style={styles.communityIcon}>
        <SymbolView name="person.2.fill" size={26} weight="semibold" tintColor={Accent.primary} fallback={null} />
      </View>
      <Text style={styles.communityTitle}>Community is on the way</Text>
      <Text style={styles.communityText}>
        Anonymous, moderated discussion between {Brand.name} members — protocols, experiences, questions. Your community profile (username, avatar and labels) is already set up in Settings, so you&apos;ll be ready the day it opens. Nothing you track is ever shared without you posting it.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  header: { paddingHorizontal: AppGutter, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  profile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  profileText: { flex: 1, gap: 2 },
  name: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 24, letterSpacing: -0.7 },
  sub: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 13 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: AppGutter, marginTop: Spacing.four, gap: Spacing.three },
  sectionTitle: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 28, letterSpacing: -0.8 },
  community: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.six, paddingHorizontal: Spacing.three },
  communityIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(52,211,153,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.one },
  communityTitle: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 22, letterSpacing: -0.5, textAlign: 'center' },
  communityText: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.body, fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
