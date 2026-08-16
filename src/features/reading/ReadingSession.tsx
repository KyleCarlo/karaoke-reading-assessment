"use client";

import { useEffect } from "react";
import Link from "next/link";
import ReadingPanel from "./ReadingPanel";
import DictionaryPanel from "@/features/dictionary/DictionaryPanel";
import { useReadingStore } from "./stores";

interface ReadingSessionProps {
  title: string;
  text: string;
  /** If provided, shows a "Continue" link to move to the next step of the flow */
  nextHref?: string;
  nextLabel?: string;
}

export default function ReadingSession({
  title,
  text,
  nextHref,
  nextLabel = "Continue",
}: ReadingSessionProps) {
  const setText = useReadingStore((s) => s.setText);

  useEffect(() => {
    setText(text);
    // Only re-sync when the passage itself changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Left: Reading Panel */}
      <div className="flex-1 p-6 overflow-hidden bg-panel border-r border-panel-border flex flex-col">
        <div className="flex-1 min-h-0">
          <ReadingPanel title={title} />
        </div>

        {nextHref && (
          <div className="pt-4 mt-2 border-t border-panel-border flex justify-end">
            <Link
              href={nextHref}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {nextLabel} →
            </Link>
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
