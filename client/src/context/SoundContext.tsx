import { createContext, useContext, ReactNode } from 'react';
import { useSound, SoundType } from '@/hooks/useSound';

interface SoundContextType {
  isSoundEnabled: boolean;
  toggleSound: () => void;
  playSound: (sound: SoundType) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const SoundProvider = ({ children }: { children: ReactNode }) => {
  const sound = useSound();

  return (
    <SoundContext.Provider value={sound}>
      {children}
    </SoundContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSoundContext = () => {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSoundContext must be used within a SoundProvider');
  }
  return context;
};
