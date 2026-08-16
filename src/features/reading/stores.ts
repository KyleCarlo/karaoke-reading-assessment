import { create } from "zustand";
import { SAMPLE_TEXT } from "@/lib/utils";

function tokenize(text: string): string[] {
  return text.split(/(\s+)/);
}

function firstWordIndex(words: string[]): number {
  const idx = words.findIndex((w) => w.trim() !== "");
  return idx === -1 ? 0 : idx;
}

function nextWordIndex(words: string[], from: number): number | null {
  for (let i = from + 1; i < words.length; i++) {
    if (words[i].trim() !== "") return i;
  }
  return null;
}

interface ReadingStore {
  words: string[];
  highlightIndex: number;
  isPlaying: boolean;
  /** Speed multiplier: 0.5x (slow) – 2.5x (fast), default 1x */
  speed: number;
  /** When true, the next word click rewinds playback instead of opening the dictionary */
  rewindMode: boolean;

  setHighlightIndex: (index: number) => void;
  /** Swap in a new passage (e.g. when the route changes) and reset playback state */
  setText: (text: string) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  tick: () => void;
  setSpeed: (speed: number) => void;
  increaseSpeed: () => void;
  decreaseSpeed: () => void;
  toggleRewindMode: () => void;
  exitRewindMode: () => void;
  rewindTo: (index: number) => void;
}

const MIN_SPEED = 0.5;
const MAX_SPEED = 2.5;
const SPEED_STEP = 0.25;

/** Base ms-per-word at 1x speed. Actual interval = BASE_INTERVAL_MS / speed */
export const BASE_INTERVAL_MS = 260;

const initialWords = tokenize(SAMPLE_TEXT);

export const useReadingStore = create<ReadingStore>((set) => ({
  words: initialWords,
  highlightIndex: firstWordIndex(initialWords),
  isPlaying: false,
  speed: 1,
  rewindMode: false,

  setHighlightIndex: (index) => set({ highlightIndex: index }),

  setText: (text) => {
    const words = tokenize(text);
    set({
      words,
      highlightIndex: firstWordIndex(words),
      isPlaying: false,
      rewindMode: false,
    });
  },

  play: () =>
    set((state) => {
      const hasMore =
        state.words[state.highlightIndex]?.trim() !== "" ||
        nextWordIndex(state.words, state.highlightIndex) !== null;
      return {
        isPlaying: true,
        rewindMode: false,
        highlightIndex: hasMore
          ? state.highlightIndex
          : firstWordIndex(state.words),
      };
    }),

  pause: () => set({ isPlaying: false }),

  togglePlay: () =>
    set((state) => {
      if (state.isPlaying) return { isPlaying: false };
      const hasMore =
        state.words[state.highlightIndex]?.trim() !== "" ||
        nextWordIndex(state.words, state.highlightIndex) !== null;
      return {
        isPlaying: true,
        rewindMode: false,
        highlightIndex: hasMore
          ? state.highlightIndex
          : firstWordIndex(state.words),
      };
    }),

  tick: () =>
    set((state) => {
      const next = nextWordIndex(state.words, state.highlightIndex);
      if (next === null) {
        // reached the end of the text
        return { isPlaying: false };
      }
      return { highlightIndex: next };
    }),

  setSpeed: (speed) =>
    set({ speed: Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed)) }),

  increaseSpeed: () =>
    set((state) => ({
      speed: Math.min(
        MAX_SPEED,
        Math.round((state.speed + SPEED_STEP) * 100) / 100,
      ),
    })),

  decreaseSpeed: () =>
    set((state) => ({
      speed: Math.max(
        MIN_SPEED,
        Math.round((state.speed - SPEED_STEP) * 100) / 100,
      ),
    })),

  toggleRewindMode: () =>
    set((state) => ({ rewindMode: !state.rewindMode, isPlaying: false })),

  exitRewindMode: () => set({ rewindMode: false }),

  rewindTo: (index) =>
    set({ highlightIndex: index, isPlaying: false, rewindMode: false }),
}));
