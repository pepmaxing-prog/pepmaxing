import { WelcomeScreen } from '@/components/welcome/welcome-screen';

// First-run entry point. Once accounts exist this will redirect returning users to the dashboard.
export default function IndexScreen() {
  return <WelcomeScreen />;
}
