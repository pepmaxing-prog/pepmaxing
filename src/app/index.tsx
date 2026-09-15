import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Image
          source={require('@/assets/images/splash-icon.png')}
          style={styles.mark}
          contentFit="contain"
        />
        <ThemedText type="subtitle" style={styles.title}>
          {Brand.name}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.body}>
          Your dashboard is next. Protocols, doses, vials and injection sites will live here.
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  mark: {
    width: 96,
    height: 96,
    marginBottom: Spacing.two,
  },
  title: {
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  body: {
    textAlign: 'center',
    maxWidth: 320,
  },
});
