import { useDemographicsStore } from "@/features/demographic/stores";
import { useTrackingStore } from "./stores";
import { useComprehensionStore } from "@/features/comprehension-test/stores";
import { COMPREHENSION_QUESTIONS } from "@/lib/utils";

function csvEscape(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(values: (string | number | null | undefined)[]): string {
  return values.map(csvEscape).join(",");
}

/**
 * Builds the full assessment export as a single CSV string, organized into
 * labeled sections (session summary, reader profile, pauses, rereads,
 * dictionary lookups, speed changes, per-word dwell time for heatmap
 * analysis, and comprehension answers). Every event row carries its own
 * timestamp.
 */
export function buildAssessmentCsv(): string {
  const profile = useDemographicsStore.getState().profile;
  const tracking = useTrackingStore.getState();
  const comprehension = useComprehensionStore.getState();

  const lines: string[] = [];

  // --- Session summary ---
  const totalDurationMs =
    tracking.sessionStartedAt && tracking.sessionEndedAt
      ? new Date(tracking.sessionEndedAt).getTime() -
        new Date(tracking.sessionStartedAt).getTime()
      : null;

  lines.push("=== SESSION SUMMARY ===");
  lines.push(row(["metric", "value"]));
  lines.push(row(["session_start", tracking.sessionStartedAt]));
  lines.push(row(["session_end", tracking.sessionEndedAt]));
  lines.push(row(["total_duration_ms", totalDurationMs]));
  lines.push(row(["initial_speed", tracking.initialSpeed]));
  lines.push(row(["total_pauses", tracking.pauses.length]));
  lines.push(row(["total_rereads", tracking.rereads.length]));
  lines.push(row(["total_dictionary_lookups", tracking.lookups.length]));
  lines.push(row(["total_speed_changes", tracking.speedChanges.length]));
  lines.push("");

  // --- Reader profile ---
  lines.push("=== READER PROFILE ===");
  lines.push(row(["field", "value"]));
  lines.push(row(["name", profile.name]));
  lines.push(row(["level", profile.level]));
  lines.push(row(["section", profile.section]));
  lines.push(row(["difficulties", profile.difficulties.join("; ")]));
  lines.push(row(["other_difficulty_detail", profile.otherDifficultyDetail]));
  lines.push(row(["concerns", profile.concerns]));
  lines.push(row(["profile_submitted_at", profile.submittedAt]));
  lines.push("");

  // --- Pauses ---
  lines.push("=== PAUSES ===");
  lines.push(row(["timestamp", "word_index", "word", "duration_ms", "reason"]));
  for (const p of tracking.pauses) {
    lines.push(row([p.timestamp, p.wordIndex, p.word, p.durationMs, p.reason]));
  }
  lines.push("");

  // --- Rereads (rewinds) ---
  lines.push("=== REREADS ===");
  lines.push(
    row(["timestamp", "from_index", "from_word", "to_index", "to_word"]),
  );
  for (const r of tracking.rereads) {
    lines.push(
      row([r.timestamp, r.fromIndex, r.fromWord, r.toIndex, r.toWord]),
    );
  }
  lines.push("");

  // --- Speed changes ---
  lines.push("=== SPEED CHANGES ===");
  lines.push(row(["timestamp", "speed"]));
  for (const s of tracking.speedChanges) {
    lines.push(row([s.timestamp, s.speed]));
  }
  lines.push("");

  // --- Dictionary lookups: raw log ---
  lines.push("=== DICTIONARY LOOKUPS (LOG) ===");
  lines.push(row(["timestamp", "word"]));
  for (const l of tracking.lookups) {
    lines.push(row([l.timestamp, l.word]));
  }
  lines.push("");

  // --- Dictionary lookups: aggregated counts ---
  const lookupCounts = new Map<string, number>();
  for (const l of tracking.lookups) {
    lookupCounts.set(l.word, (lookupCounts.get(l.word) ?? 0) + 1);
  }
  lines.push("=== DICTIONARY LOOKUPS (SUMMARY BY WORD) ===");
  lines.push(row(["word", "count"]));
  for (const [word, count] of Array.from(lookupCounts.entries()).sort(
    (a, b) => b[1] - a[1],
  )) {
    lines.push(row([word, count]));
  }
  lines.push("");

  // --- Word dwell time (source data for a later heatmap) ---
  const dwellByIndex = new Map<
    number,
    { word: string; totalMs: number; visits: number }
  >();
  for (const v of tracking.wordVisits) {
    const duration = v.durationMs ?? 0;
    const existing = dwellByIndex.get(v.wordIndex);
    if (existing) {
      existing.totalMs += duration;
      existing.visits += 1;
    } else {
      dwellByIndex.set(v.wordIndex, {
        word: v.word,
        totalMs: duration,
        visits: 1,
      });
    }
  }
  lines.push("=== WORD DWELL TIME (FOR HEATMAP) ===");
  lines.push(row(["word_index", "word", "total_dwell_ms", "visit_count"]));
  for (const [index, data] of Array.from(dwellByIndex.entries()).sort(
    (a, b) => a[0] - b[0],
  )) {
    lines.push(row([index, data.word, data.totalMs, data.visits]));
  }
  lines.push("");

  // --- Comprehension answers ---
  lines.push("=== COMPREHENSION ANSWERS ===");
  lines.push(row(["question_id", "category", "prompt", "answer"]));
  for (const q of COMPREHENSION_QUESTIONS) {
    lines.push(
      row([q.id, q.category, q.prompt, comprehension.answers[q.id] ?? ""]),
    );
  }
  lines.push(
    row(["comprehension_submitted_at", "", "", comprehension.submittedAt]),
  );

  return lines.join("\n");
}

/** Builds the CSV and triggers a browser download. */
export function downloadAssessmentCsv() {
  const profile = useDemographicsStore.getState().profile;
  const csv = buildAssessmentCsv();

  const safeName =
    (profile.name || "reader")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "reader";
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `reading-assessment-${safeName}-${dateStr}.csv`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
