import { create } from "zustand";

interface ComprehensionStore {
  answers: Record<string, string>;
  submittedAt: string | null;
  submit: (answers: Record<string, string>) => void;
  reset: () => void;
}

export const useComprehensionStore = create<ComprehensionStore>((set) => ({
  answers: {},
  submittedAt: null,
  submit: (answers) => set({ answers, submittedAt: new Date().toISOString() }),
  reset: () => set({ answers: {}, submittedAt: null }),
}));
