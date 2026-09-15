import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Lets screens under the splash choreograph their entrance with its dissolve.
 * 'showing' → 'exiting' (dissolve has begun, start entering) → 'done'.
 */
export type SplashPhase = 'showing' | 'exiting' | 'done';

const SplashPhaseContext = createContext<SplashPhase>('done');
const SetSplashPhaseContext = createContext<(phase: SplashPhase) => void>(() => {});

export function SplashPhaseProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<SplashPhase>('showing');
  return (
    <SetSplashPhaseContext.Provider value={setPhase}>
      <SplashPhaseContext.Provider value={phase}>{children}</SplashPhaseContext.Provider>
    </SetSplashPhaseContext.Provider>
  );
}

export const useSplashPhase = () => useContext(SplashPhaseContext);
export const useSetSplashPhase = () => useContext(SetSplashPhaseContext);
