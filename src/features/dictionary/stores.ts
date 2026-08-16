import { create } from "zustand";
import { useTrackingStore } from "@/features/tracking/stores";

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

type Dataset = Record<string, DictionaryEntry>;

// The whole dataset is tiny (only words actually used in the passages),
// so it's loaded once and cached in memory for the rest of the session.
let cache: Dataset | null = null;
let loadingPromise: Promise<Dataset> | null = null;

async function loadDataset(): Promise<Dataset> {
  if (cache) return cache;
  if (!loadingPromise) {
    loadingPromise = fetch("/dictionary/passage-words.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dictionary data");
        return res.json() as Promise<Dataset>;
      })
      .then((data) => {
        cache = data;
        return data;
      })
      .catch((err) => {
        // Allow retrying on a later lookup instead of caching a failure.
        loadingPromise = null;
        throw err;
      });
  }
  return loadingPromise;
}

/**
 * The scraped dataset only has the exact word forms found in the passage
 * text. Generate likely base-form candidates for common inflections so a
 * word like "asked" still resolves to "ask" if only the base form matched.
 */
function stemCandidates(word: string): string[] {
  const candidates = new Set<string>([word]);

  if (word.endsWith("ies") && word.length > 4) {
    candidates.add(word.slice(0, -3) + "y");
  }
  if (word.endsWith("ing") && word.length > 5) {
    const stem = word.slice(0, -3);
    candidates.add(stem);
    candidates.add(stem + "e");
  }
  if (word.endsWith("ed") && word.length > 4) {
    candidates.add(word.slice(0, -1)); // persuaded -> persuade
    candidates.add(word.slice(0, -2)); // demolished -> demolish
  }
  if (word.endsWith("es") && word.length > 4) {
    candidates.add(word.slice(0, -2));
    candidates.add(word.slice(0, -1));
  }
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) {
    candidates.add(word.slice(0, -1));
  }

  return Array.from(candidates);
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

    // Log every lookup attempt, successful or not.
    useTrackingStore.getState().recordLookup(word);

    set({ query: word, loading: true, error: null });

    try {
      const data = await loadDataset();

      let found: DictionaryEntry | undefined;
      for (const candidate of stemCandidates(word)) {
        if (data[candidate]) {
          found = data[candidate];
          break;
        }
      }

      if (!found) {
        set({
          loading: false,
          entry: null,
          error: `No definition found for "${word}".`,
        });
        return;
      }

      set({ entry: found, loading: false, error: null });
    } catch {
      set({
        loading: false,
        entry: null,
        error: "Couldn't load the dictionary data. Try again.",
      });
    }
  },
}));
