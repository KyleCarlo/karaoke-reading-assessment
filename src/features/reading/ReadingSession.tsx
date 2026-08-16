"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import ReadingPanel from "./ReadingPanel";
import DictionaryPanel from "@/features/dictionary/DictionaryPanel";
import { useReadingStore } from "./stores";
import { useTrackingStore } from "@/features/tracking/stores";

interface ReadingSessionProps {
  title: string;
  text: string;
  /** If provided, shows a "Continue" link once the passage has been read through */
  nextHref?: string;
  nextLabel?: string;
  /** When true, this session's reading behavior is recorded by the tracking store */
  trackingEnabled?: boolean;
}

export default function ReadingSession({
  title,
  text,
  nextHref,
  nextLabel = "Continue",
  trackingEnabled = false,
}: ReadingSessionProps) {
  const setText = useReadingStore((s) => s.setText);
  const words = useReadingStore((s) => s.words);
  const revealedUpTo = useReadingStore((s) => s.revealedUpTo);

  useEffect(() => {
    setText(text);

    // Reset tracking data for this passage, but don't start the clock yet —
    // that happens on the reader's first Play click (see reading store's
    // togglePlay/play), not on page load.
    if (trackingEnabled) {
      useTrackingStore.getState().armSession();
    }
    // Only re-sync when the passage itself changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, trackingEnabled]);

  const lastWordIndex = useMemo(() => {
    for (let i = words.length - 1; i >= 0; i--) {
      if (words[i].trim() !== "") return i;
    }
    return -1;
  }, [words]);

  const hasFinished = lastWordIndex >= 0 && revealedUpTo >= lastWordIndex;

  function handleContinueClick() {
    if (trackingEnabled) {
      useTrackingStore.getState().endSession();
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Left: Reading Panel */}
      <div className="flex-1 p-6 overflow-hidden bg-panel border-r border-panel-border flex flex-col">
        <div className="flex-1 min-h-0">
          <ReadingPanel title={title} />
        </div>

        {nextHref && (
          <div className="pt-4 mt-2 border-t border-panel-border flex justify-end items-center gap-3">
            {!hasFinished && (
              <span className="text-xs text-muted-foreground">
                Finish reading to continue
              </span>
            )}
            {hasFinished ? (
              <Link
                href={nextHref}
                onClick={handleContinueClick}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {nextLabel} →
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="px-4 py-2 rounded-md bg-secondary text-muted-foreground text-sm font-medium opacity-60 cursor-not-allowed"
              >
                {nextLabel} →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right: Dictionary Panel */}
      <div className="w-80 shrink-0 p-5 overflow-hidden bg-card border-l border-panel-border">
        <DictionaryPanel />
      </div>
    </div>
  );
}
