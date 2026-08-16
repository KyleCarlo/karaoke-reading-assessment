import { create } from "zustand";

export type PauseReason = "manual" | "lookup" | "reread";

export interface PauseEvent {
  /** When the pause started */
  timestamp: string;
  wordIndex: number;
  word: string;
  durationMs: number;
  /** Why the pause happened: deliberate Play/Pause, a dictionary lookup, or a rewind */
  reason: PauseReason;
}

export interface RereadEvent {
  timestamp: string;
  fromIndex: number;
  fromWord: string;
  toIndex: number;
  toWord: string;
}

export interface LookupEvent {
  timestamp: string;
  word: string;
}

export interface SpeedChangeEvent {
  timestamp: string;
  speed: number;
}

export interface WordVisit {
  wordIndex: number;
  word: string;
  enteredAt: string;
  /** null while this is the currently-open visit */
  exitedAt: string | null;
  /** null while this is the currently-open visit */
  durationMs: number | null;
}

interface TrackingStore {
  /** True only once the reader has actually started reading (first Play click) */
  isActive: boolean;
  /** Null until the reader clicks Play for the first time */
  sessionStartedAt: string | null;
  sessionEndedAt: string | null;
  /** Whatever speed was set at the moment the reader first clicked Play */
  initialSpeed: number | null;

  pauses: PauseEvent[];
  rereads: RereadEvent[];
  lookups: LookupEvent[];
  speedChanges: SpeedChangeEvent[];
  wordVisits: WordVisit[];

  // Internal bookkeeping for an in-progress pause; not exported directly.
  activePauseStartedAt: string | null;
  activePauseWordIndex: number | null;
  activePauseWord: string | null;
  activePauseReason: PauseReason | null;

  /**
   * Prepare tracking for a new passage: clears all previous data but does
   * NOT start the clock. Call this when the reading page mounts.
   */
  armSession: () => void;
  /**
   * Actually starts the session clock and begins recording. Call this the
   * first time the reader clicks Play — not on page load. Records
   * whatever speed was set at that moment as the initial speed.
   */
  beginReading: (wordIndex: number, word: string, initialSpeed: number) => void;
  /** End the current session, closing out any open pause/word visit */
  endSession: () => void;
  /** Call whenever the highlighted word changes (auto-advance or rewind) */
  recordWordEnter: (wordIndex: number, word: string) => void;
  /** Call when playback pauses while it was previously playing */
  recordPauseStart: (
    wordIndex: number,
    word: string,
    reason: PauseReason,
  ) => void;
  /** Call when playback resumes from a pause */
  recordPauseEnd: () => void;
  /** Call whenever the reader rewinds to an earlier word */
  recordReread: (
    fromIndex: number,
    fromWord: string,
    toIndex: number,
    toWord: string,
  ) => void;
  /** Call for every dictionary lookup attempt, successful or not */
  recordLookup: (word: string) => void;
  /** Call whenever the reader changes the playback speed during reading */
  recordSpeedChange: (speed: number) => void;
}

function nowIso(): string {
  return new Date().toISOString();
}

function closeOpenVisit(wordVisits: WordVisit[], ts: string): WordVisit[] {
  const last = wordVisits[wordVisits.length - 1];
  if (!last || last.exitedAt !== null) return wordVisits;
  const started = new Date(last.enteredAt).getTime();
  const ended = new Date(ts).getTime();
  return [
    ...wordVisits.slice(0, -1),
    { ...last, exitedAt: ts, durationMs: Math.max(0, ended - started) },
  ];
}

export const useTrackingStore = create<TrackingStore>((set, get) => ({
  isActive: false,
  sessionStartedAt: null,
  sessionEndedAt: null,
  initialSpeed: null,
  pauses: [],
  rereads: [],
  lookups: [],
  speedChanges: [],
  wordVisits: [],
  activePauseStartedAt: null,
  activePauseWordIndex: null,
  activePauseWord: null,
  activePauseReason: null,

  armSession: () =>
    set({
      isActive: false,
      sessionStartedAt: null,
      sessionEndedAt: null,
      initialSpeed: null,
      pauses: [],
      rereads: [],
      lookups: [],
      speedChanges: [],
      wordVisits: [],
      activePauseStartedAt: null,
      activePauseWordIndex: null,
      activePauseWord: null,
      activePauseReason: null,
    }),

  beginReading: (wordIndex, word, initialSpeed) => {
    const ts = nowIso();
    set({
      isActive: true,
      sessionStartedAt: ts,
      initialSpeed,
      wordVisits: [
        { wordIndex, word, enteredAt: ts, exitedAt: null, durationMs: null },
      ],
    });
  },

  endSession: () => {
    const state = get();
    if (!state.isActive) return;
    const ts = nowIso();

    let pauses = state.pauses;
    if (
      state.activePauseStartedAt !== null &&
      state.activePauseWordIndex !== null &&
      state.activePauseReason !== null
    ) {
      const started = new Date(state.activePauseStartedAt).getTime();
      const ended = new Date(ts).getTime();
      pauses = [
        ...pauses,
        {
          timestamp: state.activePauseStartedAt,
          wordIndex: state.activePauseWordIndex,
          word: state.activePauseWord ?? "",
          durationMs: Math.max(0, ended - started),
          reason: state.activePauseReason,
        },
      ];
    }

    set({
      isActive: false,
      sessionEndedAt: ts,
      pauses,
      wordVisits: closeOpenVisit(state.wordVisits, ts),
      activePauseStartedAt: null,
      activePauseWordIndex: null,
      activePauseWord: null,
      activePauseReason: null,
    });
  },

  recordWordEnter: (wordIndex, word) => {
    const state = get();
    if (!state.isActive) return;
    const ts = nowIso();
    const closed = closeOpenVisit(state.wordVisits, ts);
    set({
      wordVisits: [
        ...closed,
        { wordIndex, word, enteredAt: ts, exitedAt: null, durationMs: null },
      ],
    });
  },

  recordPauseStart: (wordIndex, word, reason) => {
    const state = get();
    if (!state.isActive) return;
    if (state.activePauseStartedAt !== null) return; // already mid-pause
    set({
      activePauseStartedAt: nowIso(),
      activePauseWordIndex: wordIndex,
      activePauseWord: word,
      activePauseReason: reason,
    });
  },

  recordPauseEnd: () => {
    const state = get();
    if (!state.isActive) return;
    if (
      state.activePauseStartedAt === null ||
      state.activePauseWordIndex === null ||
      state.activePauseReason === null
    )
      return;

    const ts = nowIso();
    const started = new Date(state.activePauseStartedAt).getTime();
    const ended = new Date(ts).getTime();

    set({
      pauses: [
        ...state.pauses,
        {
          timestamp: state.activePauseStartedAt,
          wordIndex: state.activePauseWordIndex,
          word: state.activePauseWord ?? "",
          durationMs: Math.max(0, ended - started),
          reason: state.activePauseReason,
        },
      ],
      activePauseStartedAt: null,
      activePauseWordIndex: null,
      activePauseWord: null,
      activePauseReason: null,
    });
  },

  recordReread: (fromIndex, fromWord, toIndex, toWord) => {
    const state = get();
    if (!state.isActive) return;
    set({
      rereads: [
        ...state.rereads,
        { timestamp: nowIso(), fromIndex, fromWord, toIndex, toWord },
      ],
    });
  },

  recordLookup: (word) => {
    const state = get();
    if (!state.isActive) return;
    set({ lookups: [...state.lookups, { timestamp: nowIso(), word }] });
  },

  recordSpeedChange: (speed) => {
    const state = get();
    if (!state.isActive) return;
    set({
      speedChanges: [...state.speedChanges, { timestamp: nowIso(), speed }],
    });
  },
}));
