import { create } from "zustand";
import { persist } from "zustand/middleware";

type TranslationType = "en.daryabadi" | "en.hilali";

interface TranslationState {
  translation: TranslationType;
  setTranslation: (translation: TranslationType) => void;
}

export const useTranslationStore = create<TranslationState>()(
  persist(
    (set) => ({
      translation: "en.daryabadi", // Default translation
      setTranslation: (translation) => set({ translation }),
    }),
    {
      name: "quran-translation-storage", // Local storage key
    }
  )
);
