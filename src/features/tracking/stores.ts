import { create } from "zustand";

export type PauseReason = "manual" | "lookup" | "reread" | "finished";

export interface PauseEvent {
  /** When the pause started */
  timestamp: string;
  wordIndex: number;
  word: string;
  durationMs: number;
  /** Why the pause happened: deliberate Play/Pause, a dictionary lookup,
   * a rewind, or reaching the end of the passage */
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

/**
 * A span of time the session was actively "open" — from starting/resuming
 * to the next stop (reaching the last word, or clicking Continue). The
 * gap between one segment's end and the next segment's start (e.g. idle
 * time after finishing, before rereading something) is NOT reading time.
 */
export interface ActiveSegment {
  start: string;
  end: string | null;
}

interface TrackingStore {
  /** True only while a reading segment is currently open */
  isActive: boolean;
  /** Null until the reader clicks Play for the first time */
  sessionStartedAt: string | null;
  /** Timestamp of the most recent stop (auto-stop at the end, or Continue click) */
  sessionEndedAt: string | null;
  /** Whatever speed was set at the moment the reader first clicked Play */
  initialSpeed: number | null;

  pauses: PauseEvent[];
  rereads: RereadEvent[];
  lookups: LookupEvent[];
  speedChanges: SpeedChangeEvent[];
  wordVisits: WordVisit[];
  segments: ActiveSegment[];

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
   * Actually starts the session clock and opens the first active segment.
   * Call this the first time the reader clicks Play — not on page load.
   */
  beginReading: (wordIndex: number, word: string, initialSpeed: number) => void;
  /**
   * The highlight reached the last word and displayed it for its normal
   * duration. Closes the active segment and stops the clock, but opens a
   * "finished" pause that stays open (no duration yet) until the reader
   * goes back into the text or the session is explicitly ended.
   */
  finishReading: (wordIndex: number, word: string) => void;
  /**
   * Stops the session: closes the current active segment and finalizes
   * any open pause (including a lingering "finished" one) using the
   * current time as its end. Called when Continue is clicked.
   */
  endSession: () => void;
  /**
   * Reopens a new active segment if the session had previously stopped,
   * finalizing whatever pause was left open (typically the "finished"
   * one) with its real duration. Called when the reader goes back into
   * the text (a reread, or restarting from the top) after an auto-stop.
   */
  resumeIfEnded: () => void;
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

function closeOpenSegment(
  segments: ActiveSegment[],
  ts: string,
): ActiveSegment[] {
  const last = segments[segments.length - 1];
  if (!last || last.end !== null) return segments;
  return [...segments.slice(0, -1), { ...last, end: ts }];
}

/** Finalizes the currently-open pause (if any) into a completed PauseEvent. */
function finalizeActivePause(
  state: Pick<
    TrackingStore,
    | "pauses"
    | "activePauseStartedAt"
    | "activePauseWordIndex"
    | "activePauseWord"
    | "activePauseReason"
  >,
  ts: string,
): PauseEvent[] {
  if (
    state.activePauseStartedAt === null ||
    state.activePauseWordIndex === null ||
    state.activePauseReason === null
  ) {
    return state.pauses;
  }
  const started = new Date(state.activePauseStartedAt).getTime();
  const ended = new Date(ts).getTime();
  return [
    ...state.pauses,
    {
      timestamp: state.activePauseStartedAt,
      wordIndex: state.activePauseWordIndex,
      word: state.activePauseWord ?? "",
      durationMs: Math.max(0, ended - started),
      reason: state.activePauseReason,
    },
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
  segments: [],
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
      segments: [],
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
      segments: [{ start: ts, end: null }],
      wordVisits: [
        { wordIndex, word, enteredAt: ts, exitedAt: null, durationMs: null },
      ],
    });
  },

  finishReading: (wordIndex, word) => {
    const state = get();
    if (!state.isActive) return;
    const ts = nowIso();
    set({
      isActive: false,
      sessionEndedAt: ts,
      segments: closeOpenSegment(state.segments, ts),
      wordVisits: closeOpenVisit(state.wordVisits, ts),
      // Open a "finished" pause — left open on purpose, closed later by
      // resumeIfEnded() or endSession() with its real duration.
      activePauseStartedAt: ts,
      activePauseWordIndex: wordIndex,
      activePauseWord: word,
      activePauseReason: "finished",
    });
  },

  endSession: () => {
    const state = get();
    if (state.sessionStartedAt === null) return; // never started, nothing to do
    const ts = nowIso();

    set({
      isActive: false,
      sessionEndedAt: ts,
      pauses: finalizeActivePause(state, ts),
      segments: closeOpenSegment(state.segments, ts),
      wordVisits: closeOpenVisit(state.wordVisits, ts),
      activePauseStartedAt: null,
      activePauseWordIndex: null,
      activePauseWord: null,
      activePauseReason: null,
    });
  },

  resumeIfEnded: () => {
    const state = get();
    if (state.isActive || state.sessionStartedAt === null) return;
    const ts = nowIso();
    set({
      isActive: true,
      sessionEndedAt: null,
      pauses: finalizeActivePause(state, ts),
      segments: [...state.segments, { start: ts, end: null }],
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
    set({
      pauses: finalizeActivePause(state, ts),
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
