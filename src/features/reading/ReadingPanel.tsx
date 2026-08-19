"use client";

import { useEffect, type ReactNode } from "react";
import { useReadingStore, BASE_INTERVAL_MS } from "./stores";
import { useDictionaryStore } from "@/features/dictionary/stores";

function cleanWord(raw: string) {
  return raw.replace(/^[^a-zA-Z']+|[^a-zA-Z']+$/g, "");
}

/** A run of whitespace that contains a blank line marks a new paragraph. */
function isParagraphBreak(whitespace: string) {
  return /\n[ \t]*\n/.test(whitespace);
}

/** A single newline (not a paragraph break) marks a line break within a paragraph. */
function isLineBreak(whitespace: string) {
  return whitespace.includes("\n");
}

interface ReadingPanelProps {
  title?: string;
}

export default function ReadingPanel({ title }: ReadingPanelProps) {
  const words = useReadingStore((s) => s.words);
  const highlightIndex = useReadingStore((s) => s.highlightIndex);
  const isPlaying = useReadingStore((s) => s.isPlaying);
  const speed = useReadingStore((s) => s.speed);
  const rewindMode = useReadingStore((s) => s.rewindMode);
  const progressiveReveal = useReadingStore((s) => s.progressiveReveal);
  const revealedUpTo = useReadingStore((s) => s.revealedUpTo);

  const togglePlay = useReadingStore((s) => s.togglePlay);
  const tick = useReadingStore((s) => s.tick);
  const setSpeed = useReadingStore((s) => s.setSpeed);
  const increaseSpeed = useReadingStore((s) => s.increaseSpeed);
  const decreaseSpeed = useReadingStore((s) => s.decreaseSpeed);
  const toggleRewindMode = useReadingStore((s) => s.toggleRewindMode);
  const rewindTo = useReadingStore((s) => s.rewindTo);
  const pause = useReadingStore((s) => s.pause);

  const lookup = useDictionaryStore((s) => s.lookup);

  // Drive the karaoke-style auto-advance while playing.
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = BASE_INTERVAL_MS / speed;
    const interval = setInterval(() => {
      tick();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [isPlaying, speed, tick]);

  // Space bar toggles play/pause, right/left arrows adjust speed, and
  // Shift toggles rewind mode — same as clicking "← Rewind to".
  // Ignored while the user is typing (e.g. in the dictionary search box).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isTyping) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
      if (e.code === "ArrowRight") {
        e.preventDefault();
        increaseSpeed();
      }
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        decreaseSpeed();
      }
      if (e.key === "Shift" && !e.repeat) {
        toggleRewindMode();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, increaseSpeed, decreaseSpeed, toggleRewindMode]);

  function handleWordClick(word: string, i: number) {
    if (word.trim() === "") return;
    if (progressiveReveal && i > revealedUpTo) return; // not yet reached

    if (rewindMode) {
      rewindTo(i);
      return;
    }

    pause("lookup");
    const clean = cleanWord(word);
    if (clean) lookup(clean);
  }

  function handleLookupCurrent() {
    pause("lookup");
    const current = words[highlightIndex];
    const clean = current ? cleanWord(current) : "";
    if (clean) lookup(clean);
  }

  // Group the flat words array into paragraphs, splitting on blank-line
  // whitespace runs, so each paragraph can get a first-line indent like
  // the original document.
  const paragraphs: ReactNode[][] = [[]];
  words.forEach((word, i) => {
    if (word.trim() === "") {
      if (isParagraphBreak(word)) {
        paragraphs.push([]);
      } else if (isLineBreak(word)) {
        paragraphs[paragraphs.length - 1].push(<br key={i} />);
      } else {
        paragraphs[paragraphs.length - 1].push(<span key={i}> </span>);
      }
      return;
    }

    const isHidden = progressiveReveal && i > revealedUpTo;

    paragraphs[paragraphs.length - 1].push(
      <span
        key={i}
        onClick={() => handleWordClick(word, i)}
        className={`rounded-sm px-0.5 transition-colors duration-150 ${
          isHidden
            ? "cursor-default select-none blur-sm"
            : `cursor-pointer ${
                highlightIndex === i
                  ? "bg-highlight-active text-accent-foreground"
                  : "hover:bg-highlight/50"
              } ${rewindMode ? "hover:ring-1 hover:ring-primary" : ""}`
        }`}
      >
        {word}
      </span>,
    );
  });
  const nonEmptyParagraphs = paragraphs.filter((p) => p.length > 0);

  return (
    <div className="flex flex-col h-full">
      {title && (
        <h1 className="font-reading text-lg font-semibold text-foreground mb-3">
          {title}
        </h1>
      )}

      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-panel-border flex-wrap">
        <button
          onClick={togglePlay}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <button
          onClick={toggleRewindMode}
          title="Click a word in the text to rewind to it (or press Shift)"
          className={`px-4 py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90 ${
            rewindMode
              ? "bg-accent text-accent-foreground"
              : "bg-secondary text-secondary-foreground"
          }`}
        >
          {rewindMode ? "Click a word…" : "← Rewind to"}
        </button>

        <button
          onClick={handleLookupCurrent}
          className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Look up →
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Speed {speed.toFixed(2)}x
          </span>
          <button
            onClick={decreaseSpeed}
            title="Decrease speed (Left Arrow)"
            className="px-2.5 py-2 rounded-md bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            ◀
          </button>
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.25}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-28 accent-primary"
            aria-label="Playback speed"
          />
          <button
            onClick={increaseSpeed}
            title="Increase speed (Right Arrow)"
            className="px-2.5 py-2 rounded-md bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            ▶
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 font-reading text-lg leading-relaxed">
        {nonEmptyParagraphs.map((paragraph, pi) => (
          <p key={pi} className="indent-8 mb-4 last:mb-0">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
