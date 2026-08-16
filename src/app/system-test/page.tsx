"use client";

import { useState } from "react";
import ReadingSession from "@/features/reading/ReadingSession";
import { SYSTEM_TEST_TEXT, PROGRESSIVE_REVEAL_ENABLED } from "@/lib/utils";

export default function SystemTestPage() {
  const [showInstructions, setShowInstructions] = useState(true);

  return (
    <>
      <ReadingSession
        title="System Test"
        text={SYSTEM_TEST_TEXT}
        nextHref="/reading"
        nextLabel="Start reading"
      />

      {/* Reopen instructions at any time */}
      <button
        type="button"
        onClick={() => setShowInstructions(true)}
        title="Show instructions"
        className="fixed bottom-6 right-6 h-11 w-11 rounded-full bg-primary text-primary-foreground text-lg font-semibold shadow-md hover:opacity-90 transition-opacity flex items-center justify-center"
      >
        ?
      </button>

      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            aria-hidden="true"
            onClick={() => setShowInstructions(false)}
          />

          {/* Modal */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="instructions-title"
            className="relative w-full max-w-lg bg-card border border-panel-border rounded-lg shadow-lg p-8 max-h-[85vh] overflow-y-auto"
          >
            <h2
              id="instructions-title"
              className="font-reading text-xl font-semibold text-foreground mb-1"
            >
              Welcome — let&apos;s get you set up
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              This quick system test lets you try out the controls before the
              real assessment begins.
            </p>

            <div className="space-y-6 mb-6">
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-primary mb-2">
                  How to use it
                </h3>
                <ul className="text-sm text-foreground space-y-2 list-disc list-inside">
                  <li>
                    <span className="font-medium">Play / Pause</span> — starts
                    or stops the highlighting. You can also press the{" "}
                    <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-xs">
                      Space
                    </kbd>{" "}
                    bar.
                  </li>
                  <li>
                    <span className="font-medium">Speed</span> — use the slider,
                    the ◀ / ▶ buttons, or the Left / Right arrow keys to slow
                    down or speed up.
                  </li>
                  <li>
                    <span className="font-medium">Click a word</span> — pauses
                    and shows its definition in the panel on the right.
                  </li>
                  <li>
                    <span className="font-medium">← Rewind to</span> — click
                    this, then click any word in the text to jump the reading
                    back to that point.
                  </li>
                  <li>
                    <span className="font-medium">Dictionary panel</span> — you
                    can also type a word directly to look it up at any time.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-primary mb-2">
                  Assessment flow
                </h3>
                <ol className="text-sm space-y-1.5 list-decimal list-inside">
                  <li className="text-muted-foreground">Reader profile</li>
                  <li className="font-medium text-foreground">
                    System test{" "}
                    <span className="font-normal text-muted-foreground">
                      — you are here
                    </span>
                  </li>
                  <li className="text-muted-foreground">Reading passage</li>
                  <li className="text-muted-foreground">Comprehension test</li>
                </ol>
              </div>

              {PROGRESSIVE_REVEAL_ENABLED && (
                <p className="text-xs text-muted-foreground border-t border-border pt-4">
                  Note: words ahead of the highlight will appear blurred until
                  the highlight reaches them. This is expected — it keeps you
                  from reading ahead of the pace.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="w-full px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Got it, let&apos;s begin
            </button>
          </div>
        </div>
      )}
    </>
  );
}
