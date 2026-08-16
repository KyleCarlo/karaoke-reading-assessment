import { create } from "zustand";

export type ReadingDifficulty =
  | "blurry-vision"
  | "dyslexia"
  | "hyperlexia"
  | "adhd"
  | "apd"
  | "language-processing-disorder"
  | "alexia"
  | "visual-perceptual-motor-deficit"
  | "other";

export interface ReaderProfile {
  name: string;
  level: string;
  section: string;
  difficulties: ReadingDifficulty[];
  otherDifficultyDetail: string;
  concerns: string;
  consentGiven: boolean;
  submittedAt: string | null;
}

interface DemographicsStore {
  profile: ReaderProfile;
  setField: <
    K extends keyof Omit<ReaderProfile, "difficulties" | "submittedAt">,
  >(
    field: K,
    value: ReaderProfile[K],
  ) => void;
  toggleDifficulty: (difficulty: ReadingDifficulty) => void;
  submitProfile: () => void;
  resetProfile: () => void;
}

const emptyProfile: ReaderProfile = {
  name: "",
  level: "",
  section: "",
  difficulties: [],
  otherDifficultyDetail: "",
  concerns: "",
  consentGiven: false,
  submittedAt: null,
};

export const useDemographicsStore = create<DemographicsStore>((set) => ({
  profile: emptyProfile,

  setField: (field, value) =>
    set((state) => ({ profile: { ...state.profile, [field]: value } })),

  toggleDifficulty: (difficulty) =>
    set((state) => {
      const has = state.profile.difficulties.includes(difficulty);
      const difficulties = has
        ? state.profile.difficulties.filter((d) => d !== difficulty)
        : [...state.profile.difficulties, difficulty];
      return { profile: { ...state.profile, difficulties } };
    }),

  submitProfile: () =>
    set((state) => ({
      profile: { ...state.profile, submittedAt: new Date().toISOString() },
    })),

  resetProfile: () => set({ profile: emptyProfile }),
}));
