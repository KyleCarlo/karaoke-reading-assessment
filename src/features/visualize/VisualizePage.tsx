"use client";

import { useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { SAMPLE_TEXT } from "@/lib/utils";
import { parseAssessmentCsv, type ParsedAssessment } from "./parseCSV";

function tokenize(text: string): string[] {
  return text.split(/(\s+)/);
}

function isParagraphBreak(whitespace: string) {
  return /\n[ \t]*\n/.test(whitespace);
}

function isLineBreak(whitespace: string) {
  return whitespace.includes("\n");
}

const HEATMAP_LOW = { r: 251, g: 217, b: 81 }; // yellow, matches --highlight
const HEATMAP_HIGH = { r: 204, g: 51, b: 51 }; // red, matches --destructive

function heatmapColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(
    HEATMAP_LOW.r + (HEATMAP_HIGH.r - HEATMAP_LOW.r) * clamped,
  );
  const g = Math.round(
    HEATMAP_LOW.g + (HEATMAP_HIGH.g - HEATMAP_LOW.g) * clamped,
  );
  const b = Math.round(
    HEATMAP_LOW.b + (HEATMAP_HIGH.b - HEATMAP_LOW.b) * clamped,
  );
  return `rgb(${r}, ${g}, ${b})`;
}

const PAUSE_COLORS: Record<string, string> = {
  manual: "#2563eb", // blue
  lookup: "#9333ea", // purple
  reread: "#ea580c", // orange
  finished: "#4b5563", // gray
  speed_change: "#0d9488", // teal
};

const PAUSE_LABELS: Record<string, string> = {
  manual: "Manual pause",
  lookup: "Dictionary lookup",
  reread: "Reread (rewind)",
  finished: "Finished reading",
  speed_change: "Speed adjustment",
};

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background border border-border rounded-md px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

/** Pause bar width: capped square-root scale, not linear ms-to-px.
 * Linear (1px/ms) made multi-second pauses thousands of pixels wide and
 * broke the text layout. Sqrt keeps "longer = wider" monotonic while
 * compressing the extremes into a legible range; the min/max caps
 * guarantee even a near-zero pause stays visible and even an extreme
 * outlier stays on the line. Exact duration is always in the tooltip
 * regardless, so nothing is lost — only the visual scale changes. */
const PAUSE_BAR_SCALE = 2.2;
const PAUSE_BAR_MIN_PX = 6;
const PAUSE_BAR_MAX_PX = 140;

function pauseBarWidthPx(durationMs: number): number {
  const raw = PAUSE_BAR_SCALE * Math.sqrt(Math.max(0, durationMs));
  return Math.max(
    PAUSE_BAR_MIN_PX,
    Math.min(PAUSE_BAR_MAX_PX, Math.round(raw)),
  );
}

/** A pause marker: width scales with duration (capped sqrt scale, see above). */
function PauseBar({
  durationMs,
  reason,
}: {
  durationMs: number;
  reason: string;
}) {
  const widthPx = pauseBarWidthPx(durationMs);
  return (
    <span
      title={`${PAUSE_LABELS[reason] ?? reason} — ${formatMs(durationMs)}`}
      style={{
        display: "inline-block",
        width: `${widthPx}px`,
        height: "0.9em",
        backgroundColor: PAUSE_COLORS[reason] ?? "#000",
        verticalAlign: "middle",
        borderRadius: "1px",
      }}
      className="mx-px cursor-help"
    />
  );
}

export default function VisualizePage() {
  const [data, setData] = useState<ParsedAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = parseAssessmentCsv(text);
        setData(parsed);
        setError(null);
      } catch {
        setError(
          "Couldn't parse this file. Make sure it's a CSV exported from this app's comprehension test page.",
        );
        setData(null);
      }
    };
    reader.onerror = () => {
      setError("Couldn't read this file.");
      setData(null);
    };
    reader.readAsText(file);
  }

  const words = useMemo(() => tokenize(SAMPLE_TEXT), []);

  const dwellByIndex = useMemo(() => {
    const map = new Map<
      number,
      { word: string; totalDwellMs: number; visitCount: number }
    >();
    if (!data) return map;
    for (const row of data.wordDwell) {
      const idx = parseInt(row.word_index, 10);
      if (Number.isNaN(idx)) continue;
      map.set(idx, {
        word: row.word,
        totalDwellMs: parseFloat(row.total_dwell_ms) || 0,
        visitCount: parseInt(row.visit_count, 10) || 0,
      });
    }
    return map;
  }, [data]);

  const { minDwell, maxDwell } = useMemo(() => {
    const values = Array.from(dwellByIndex.values())
      .filter((d) => d.visitCount > 0)
      .map((d) => d.totalDwellMs);
    if (values.length === 0) return { minDwell: 0, maxDwell: 0 };
    return { minDwell: Math.min(...values), maxDwell: Math.max(...values) };
  }, [dwellByIndex]);

  const pausesByIndex = useMemo(() => {
    const map = new Map<
      number,
      { reason: string; durationMs: number; timestamp: string }[]
    >();
    if (!data) return map;
    for (const row of data.pauses) {
      const idx = parseInt(row.word_index, 10);
      if (Number.isNaN(idx)) continue;
      const arr = map.get(idx) ?? [];
      arr.push({
        reason: row.reason,
        durationMs: parseFloat(row.duration_ms) || 0,
        timestamp: row.timestamp,
      });
      map.set(idx, arr);
    }
    return map;
  }, [data]);

  // Group the flat words array into paragraphs, same approach as ReadingPanel.
  const paragraphs = useMemo(() => {
    const groups: ReactNode[][] = [[]];
    words.forEach((word, i) => {
      if (word.trim() === "") {
        if (isParagraphBreak(word)) {
          groups.push([]);
        } else if (isLineBreak(word)) {
          groups[groups.length - 1].push(<br key={i} />);
        } else {
          groups[groups.length - 1].push(<span key={i}> </span>);
        }
        return;
      }

      const dwell = dwellByIndex.get(i);
      const visited = dwell !== undefined && dwell.visitCount > 0;
      let style: React.CSSProperties = {};
      if (visited) {
        const t =
          maxDwell === minDwell
            ? 0.5
            : (dwell.totalDwellMs - minDwell) / (maxDwell - minDwell);
        style = { backgroundColor: heatmapColor(t) };
      }

      const pauses = pausesByIndex.get(i) ?? [];

      groups[groups.length - 1].push(
        <span key={i}>
          <span
            style={style}
            title={
              visited
                ? `"${word}" — ${formatMs(dwell.totalDwellMs)} total dwell, ${dwell.visitCount} visit(s)`
                : `"${word}" — not visited`
            }
            className={`rounded-sm px-0.5 ${visited ? "" : "opacity-50"}`}
          >
            {word}
          </span>
          {pauses.map((p, pi) => (
            <PauseBar key={pi} durationMs={p.durationMs} reason={p.reason} />
          ))}
        </span>,
      );
    });
    return groups.filter((g) => g.length > 0);
  }, [words, dwellByIndex, pausesByIndex, minDwell, maxDwell]);

  // Dictionary words searched, sorted most- to least-frequent, with the
  // individual lookup timestamps folded in for a hover tooltip.
  const dictionaryLookups = useMemo(() => {
    if (!data) return [];
    const timestampsByWord = new Map<string, string[]>();
    for (const row of data.lookupsLog) {
      const arr = timestampsByWord.get(row.word) ?? [];
      arr.push(row.timestamp);
      timestampsByWord.set(row.word, arr);
    }
    return data.lookupsSummary
      .map((row) => ({
        word: row.word,
        count: parseInt(row.count, 10) || 0,
        timestamps: timestampsByWord.get(row.word) ?? [],
      }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const profile = data?.readerProfile;
  const summary = data?.sessionSummary;

  return (
    <div className="min-h-screen w-full bg-background px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-reading text-2xl font-semibold text-foreground mb-1">
            Assessment Visualizer
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload a reading assessment CSV export to visualize dwell time and
            pauses over the passage.
          </p>
        </div>

        {/* Upload control */}
        <div className="bg-card border border-panel-border rounded-lg p-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Upload CSV
          </label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:opacity-90 file:cursor-pointer cursor-pointer"
          />
          {fileName && !error && (
            <p className="mt-2 text-xs text-muted-foreground">
              Loaded: {fileName}
            </p>
          )}
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </div>

        {data && (
          <>
            {/* Reader profile */}
            {profile && (
              <div className="bg-card border border-panel-border rounded-lg p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">
                  Reader Profile
                </h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name: </span>
                    <span className="text-foreground">
                      {profile.name || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Level: </span>
                    <span className="text-foreground">
                      {profile.level || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Section: </span>
                    <span className="text-foreground">
                      {profile.section || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Consent: </span>
                    <span className="text-foreground">
                      {profile.consent_given || "—"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">
                      Difficulties:{" "}
                    </span>
                    <span className="text-foreground">
                      {profile.difficulties || "None reported"}
                    </span>
                  </div>
                  {profile.other_difficulty_detail && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Other: </span>
                      <span className="text-foreground">
                        {profile.other_difficulty_detail}
                      </span>
                    </div>
                  )}
                  {profile.concerns && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Concerns: </span>
                      <span className="text-foreground">
                        {profile.concerns}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Session summary */}
            {summary && (
              <div className="bg-card border border-panel-border rounded-lg p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">
                  Session Summary
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard
                    label="Active reading"
                    value={
                      summary.active_reading_duration_ms
                        ? formatMs(Number(summary.active_reading_duration_ms))
                        : "—"
                    }
                  />
                  <StatCard
                    label="Wall clock"
                    value={
                      summary.wall_clock_duration_ms
                        ? formatMs(Number(summary.wall_clock_duration_ms))
                        : "—"
                    }
                  />
                  <StatCard
                    label="Initial speed"
                    value={
                      summary.initial_speed ? `${summary.initial_speed}x` : "—"
                    }
                  />
                  <StatCard
                    label="Pauses"
                    value={summary.total_pauses || "0"}
                  />
                  <StatCard
                    label="Rereads"
                    value={summary.total_rereads || "0"}
                  />
                  <StatCard
                    label="Dictionary lookups"
                    value={summary.total_dictionary_lookups || "0"}
                  />
                  <StatCard
                    label="Speed changes"
                    value={summary.total_speed_changes || "0"}
                  />
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="bg-card border border-panel-border rounded-lg p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">
                Legend
              </h2>

              <div className="mb-4">
                <div className="text-xs text-muted-foreground mb-1.5">
                  Dwell time (word highlight)
                </div>
                <div
                  className="h-4 rounded-md w-full max-w-sm"
                  style={{
                    background: `linear-gradient(to right, ${heatmapColor(0)}, ${heatmapColor(1)})`,
                  }}
                />
                <div className="flex justify-between max-w-sm text-xs text-muted-foreground mt-1">
                  <span>Lowest ({formatMs(minDwell)})</span>
                  <span>Highest ({formatMs(maxDwell)})</span>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1.5">
                  Pauses (bar width scales with duration)
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {Object.entries(PAUSE_LABELS).map(([reason, label]) => (
                    <div key={reason} className="flex items-center gap-1.5">
                      <span
                        style={{
                          display: "inline-block",
                          width: "20px",
                          height: "0.9em",
                          backgroundColor: PAUSE_COLORS[reason],
                          borderRadius: "1px",
                        }}
                      />
                      <span className="text-xs text-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Passage with heatmap + pause bars */}
            <div className="bg-panel border border-panel-border rounded-lg p-6 overflow-x-auto">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">
                Passage
              </h2>
              <div className="font-reading text-lg leading-relaxed">
                {paragraphs.map((paragraph, pi) => (
                  <p key={pi} className="indent-8 mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {/* Dictionary lookups */}
            <div className="bg-card border border-panel-border rounded-lg p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">
                Dictionary Lookups
              </h2>
              {dictionaryLookups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No dictionary lookups recorded.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {dictionaryLookups.map((entry) => (
                    <span
                      key={entry.word}
                      title={
                        entry.timestamps.length > 0
                          ? entry.timestamps.join("\n")
                          : undefined
                      }
                      className="inline-flex items-center gap-1.5 bg-background border border-border rounded-full px-3 py-1 text-sm cursor-help"
                    >
                      <span className="text-foreground">{entry.word}</span>
                      <span className="text-xs text-muted-foreground bg-secondary rounded-full px-1.5 py-0.5">
                        {entry.count}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Comprehension answers */}
            {data.comprehensionAnswers.length > 0 && (
              <div className="bg-card border border-panel-border rounded-lg p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">
                  Comprehension Answers
                </h2>
                <div className="space-y-5">
                  {data.comprehensionAnswers.map((q, qi) => (
                    <div key={q.question_id || qi}>
                      <span className="text-xs font-medium uppercase tracking-wide text-primary">
                        {q.category}
                      </span>
                      <p className="text-sm font-medium text-foreground mt-0.5 mb-1.5">
                        {qi + 1}. {q.prompt}
                      </p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-background border border-border rounded-md px-3 py-2">
                        {q.answer || "(no answer)"}
                      </p>
                    </div>
                  ))}
                </div>
                {data.comprehensionSubmittedAt && (
                  <p className="text-xs text-muted-foreground mt-4">
                    Submitted at {data.comprehensionSubmittedAt}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
