import { PlaceholderTab } from '@/components/home/placeholder-tab';

export default function MeScreen() {
  return (
    <PlaceholderTab
      symbol="person.fill"
      title="Me"
      text="Your progress in one place: weight, measurements, labs and how you feel over time."
      bullets={['Trends across every cycle', 'Body metrics and lab results', 'Notes and check-ins']}
    />
  );
}
