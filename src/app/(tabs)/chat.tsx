import { PlaceholderTab } from '@/components/home/placeholder-tab';

export default function ChatScreen() {
  return (
    <PlaceholderTab
      symbol="bubble.left.and.bubble.right.fill"
      title="Assistant"
      text="Ask anything about your protocol and get an answer grounded in the research, not guesses."
      bullets={['Knows your protocol and history', 'Cites the studies it draws on', 'Never a substitute for your clinician']}
    />
  );
}
