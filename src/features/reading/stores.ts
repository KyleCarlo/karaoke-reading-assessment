import { create } from "zustand";
import { SAMPLE_TEXT, PROGRESSIVE_REVEAL_ENABLED } from "@/lib/utils";
import { useTrackingStore, type PauseReason } from "@/features/tracking/stores";

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
  /**
   * When true, words ahead of the highlight are masked until reached.
   * Set via PROGRESSIVE_REVEAL_ENABLED in lib/utils.ts — no in-app toggle.
   */
  progressiveReveal: boolean;
  /**
   * The furthest word index the reader has reached so far. Only ever
   * increases — rewinding moves highlightIndex back, but does not hide
   * text the reader has already legitimately seen.
   */
  revealedUpTo: number;

  setHighlightIndex: (index: number) => void;
  /** Swap in a new passage (e.g. when the route changes) and reset playback state */
  setText: (text: string) => void;
  play: () => void;
  /** Pause playback. Pass a reason when this pause was triggered by
   * something other than the Play/Pause control (e.g. a dictionary lookup). */
  pause: (reason?: PauseReason) => void;
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
const initialIndex = firstWordIndex(initialWords);

/**
 * Shared logic for starting playback:
 * - Never started before (sessionStartedAt is null) -> begin the session,
 *   recording the current speed as the initial speed.
 * - Session had auto-stopped at the end (isActive is false, but it did
 *   start before) -> this Play click is going back into the text (e.g.
 *   restarting from the top), so reopen a new active segment.
 * - Otherwise -> this is an ordinary resume from a manual/lookup pause.
 */
function beginOrResumePlayback(
  highlightIndex: number,
  word: string,
  speed: number,
) {
  const tracking = useTrackingStore.getState();
  if (tracking.sessionStartedAt === null) {
    tracking.beginReading(highlightIndex, word, speed);
  } else if (!tracking.isActive) {
    tracking.resumeIfEnded();
  } else {
    tracking.recordPauseEnd();
  }
}

/**
 * Shared logic for a speed adjustment: while actively playing, freeze
 * dwell-time tracking for whatever word is currently displayed. The
 * ReadingPanel auto-advance timer resets on every speed change (it has
 * to, to apply the new pace), which can otherwise inflate that word's
 * recorded dwell time — especially while dragging the speed slider,
 * which fires many rapid changes. This freeze is a no-op if one is
 * already in progress (e.g. mid-drag), and is only lifted once the
 * highlight genuinely advances to the next word (see tick()), not
 * immediately — so none of the timer-resettling time counts as dwell.
 */
function freezeDwellForSpeedChange(
  isPlaying: boolean,
  highlightIndex: number,
  word: string,
) {
  if (!isPlaying) return;
  useTrackingStore
    .getState()
    .recordPauseStart(highlightIndex, word, "speed_change");
}

export const useReadingStore = create<ReadingStore>((set) => ({
  words: initialWords,
  highlightIndex: initialIndex,
  isPlaying: false,
  speed: 1,
  rewindMode: false,
  progressiveReveal: PROGRESSIVE_REVEAL_ENABLED,
  revealedUpTo: initialIndex,

  setHighlightIndex: (index) =>
    set((state) => {
      useTrackingStore
        .getState()
        .recordWordEnter(index, state.words[index] ?? "");
      return {
        highlightIndex: index,
        revealedUpTo: Math.max(state.revealedUpTo, index),
      };
    }),

  setText: (text) => {
    const words = tokenize(text);
    const index = firstWordIndex(words);
    set({
      words,
      highlightIndex: index,
      revealedUpTo: index,
      isPlaying: false,
      rewindMode: false,
    });
  },

  play: () =>
    set((state) => {
      const hasMore =
        state.words[state.highlightIndex]?.trim() !== "" ||
        nextWordIndex(state.words, state.highlightIndex) !== null;

      beginOrResumePlayback(
        state.highlightIndex,
        state.words[state.highlightIndex] ?? "",
        state.speed,
      );

      const newIndex = hasMore
        ? state.highlightIndex
        : firstWordIndex(state.words);
      if (!hasMore) {
        useTrackingStore
          .getState()
          .recordWordEnter(newIndex, state.words[newIndex] ?? "");
      }
      return {
        isPlaying: true,
        rewindMode: false,
        highlightIndex: newIndex,
      };
    }),

  pause: (reason = "manual") =>
    set((state) => {
      if (state.isPlaying) {
        useTrackingStore
          .getState()
          .recordPauseStart(
            state.highlightIndex,
            state.words[state.highlightIndex] ?? "",
            reason,
          );
      }
      return { isPlaying: false };
    }),

  togglePlay: () =>
    set((state) => {
      if (state.isPlaying) {
        useTrackingStore
          .getState()
          .recordPauseStart(
            state.highlightIndex,
            state.words[state.highlightIndex] ?? "",
            "manual",
          );
        return { isPlaying: false };
      }

      const hasMore =
        state.words[state.highlightIndex]?.trim() !== "" ||
        nextWordIndex(state.words, state.highlightIndex) !== null;

      beginOrResumePlayback(
        state.highlightIndex,
        state.words[state.highlightIndex] ?? "",
        state.speed,
      );

      const newIndex = hasMore
        ? state.highlightIndex
        : firstWordIndex(state.words);
      if (!hasMore) {
        useTrackingStore
          .getState()
          .recordWordEnter(newIndex, state.words[newIndex] ?? "");
      }
      return {
        isPlaying: true,
        rewindMode: false,
        highlightIndex: newIndex,
      };
    }),

  tick: () =>
    set((state) => {
      // If a speed adjustment froze dwell tracking, this natural advance
      // is exactly the moment to lift it — closes out the "speed_change"
      // pause with its real duration and resumes accumulation right
      // before the word changes.
      const tracking = useTrackingStore.getState();
      if (tracking.activePauseReason === "speed_change") {
        tracking.recordPauseEnd();
      }

      const next = nextWordIndex(state.words, state.highlightIndex);
      if (next === null) {
        // Reached the last word and it has now been displayed for its
        // normal duration — this counts as a pause (reason: "finished")
        // that stays open until the reader goes back into the text
        // (rewindTo, or restarting playback from the top) or clicks
        // Continue.
        useTrackingStore
          .getState()
          .finishReading(
            state.highlightIndex,
            state.words[state.highlightIndex] ?? "",
          );
        return { isPlaying: false };
      }
      useTrackingStore.getState().recordWordEnter(next, state.words[next]);
      return {
        highlightIndex: next,
        revealedUpTo: Math.max(state.revealedUpTo, next),
      };
    }),

  setSpeed: (speed) =>
    set((state) => {
      const clamped = Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed));
      if (clamped !== state.speed) {
        useTrackingStore.getState().recordSpeedChange(clamped);
        freezeDwellForSpeedChange(
          state.isPlaying,
          state.highlightIndex,
          state.words[state.highlightIndex] ?? "",
        );
      }
      return { speed: clamped };
    }),

  increaseSpeed: () =>
    set((state) => {
      const newSpeed = Math.min(
        MAX_SPEED,
        Math.round((state.speed + SPEED_STEP) * 100) / 100,
      );
      if (newSpeed !== state.speed) {
        useTrackingStore.getState().recordSpeedChange(newSpeed);
        freezeDwellForSpeedChange(
          state.isPlaying,
          state.highlightIndex,
          state.words[state.highlightIndex] ?? "",
        );
      }
      return { speed: newSpeed };
    }),

  decreaseSpeed: () =>
    set((state) => {
      const newSpeed = Math.max(
        MIN_SPEED,
        Math.round((state.speed - SPEED_STEP) * 100) / 100,
      );
      if (newSpeed !== state.speed) {
        useTrackingStore.getState().recordSpeedChange(newSpeed);
        freezeDwellForSpeedChange(
          state.isPlaying,
          state.highlightIndex,
          state.words[state.highlightIndex] ?? "",
        );
      }
      return { speed: newSpeed };
    }),

  toggleRewindMode: () =>
    set((state) => ({ rewindMode: !state.rewindMode, isPlaying: false })),

  exitRewindMode: () => set({ rewindMode: false }),

  rewindTo: (index) =>
    set((state) => {
      const fromWord = state.words[state.highlightIndex] ?? "";
      const toWord = state.words[index] ?? "";

      // Going back into the text always reopens a stopped session.
      useTrackingStore.getState().resumeIfEnded();

      if (state.isPlaying) {
        useTrackingStore
          .getState()
          .recordPauseStart(state.highlightIndex, fromWord, "reread");
      }
      useTrackingStore
        .getState()
        .recordReread(state.highlightIndex, fromWord, index, toWord);

      // Rewinding always stops playback, so the word we land on starts in
      // a paused state — its dwell time won't accumulate until the reader
      // presses Play again.
      useTrackingStore.getState().recordWordEnter(index, toWord, false);

      // Note: revealedUpTo is intentionally left untouched here —
      // rewinding moves the highlight back without re-hiding text
      // already seen.
      return { highlightIndex: index, isPlaying: false, rewindMode: false };
    }),
}));
