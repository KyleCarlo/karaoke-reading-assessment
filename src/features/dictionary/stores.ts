import { create } from "zustand";

export interface DictionaryDefinition {
  definition: string;
  example?: string;
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  meanings: DictionaryMeaning[];
}

interface DictionaryStore {
  query: string;
  entry: DictionaryEntry | null;
  loading: boolean;
  error: string | null;

  setQuery: (query: string) => void;
  lookup: (word: string) => Promise<void>;
  reset: () => void;
}

export const useDictionaryStore = create<DictionaryStore>((set) => ({
  query: "",
  entry: null,
  loading: false,
  error: null,

  setQuery: (query) => set({ query }),

  reset: () => set({ query: "", entry: null, loading: false, error: null }),

  lookup: async (rawWord) => {
    const word = rawWord
      .trim()
      .toLowerCase()
      .replace(/^[^a-z']+|[^a-z']+$/gi, "");

    if (!word) return;

    set({ query: word, loading: true, error: null });

    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
          word,
        )}`,
      );

      if (!res.ok) {
        set({
          loading: false,
          entry: null,
          error: `No definition found for "${word}".`,
        });
        return;
      }

      const data = await res.json();
      const first = data[0];

      const entry: DictionaryEntry = {
        word: first.word,
        phonetic:
          first.phonetic ||
          first.phonetics?.find((p: { text?: string }) => p.text)?.text ||
          undefined,
        meanings: (first.meanings || []).map(
          (m: {
            partOfSpeech: string;
            definitions: { definition: string; example?: string }[];
          }) => ({
            partOfSpeech: m.partOfSpeech,
            definitions: (m.definitions || []).slice(0, 4).map((d) => ({
              definition: d.definition,
              example: d.example,
            })),
          }),
        ),
      };

      set({ entry, loading: false, error: null });
    } catch {
      set({
        loading: false,
        entry: null,
        error: "Couldn't reach the dictionary. Check your connection.",
      });
    }
  },
}));
