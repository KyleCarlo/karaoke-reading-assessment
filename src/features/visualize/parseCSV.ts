/**
 * Parses raw CSV text into rows of string cells, correctly handling
 * quoted fields that contain commas, escaped quotes (""), and embedded
 * newlines (comprehension answers can easily contain all three).
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (char === "\r") {
      i++; // skip, newline handled below
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += char;
    i++;
  }

  // Flush the final field/row if the file doesn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

interface Section {
  title: string;
  rows: string[][];
}

function splitIntoSections(rows: string[][]): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const row of rows) {
    const isBlank =
      row.length === 0 || (row.length === 1 && row[0].trim() === "");
    if (isBlank) continue;

    const isHeader = row.length === 1 && /^===.*===$/.test(row[0].trim());
    if (isHeader) {
      if (current) sections.push(current);
      current = {
        title: row[0].trim().replace(/^===\s*|\s*===$/g, ""),
        rows: [],
      };
      continue;
    }

    if (current) current.rows.push(row);
  }
  if (current) sections.push(current);
  return sections;
}

/** Converts a section's rows (first row = column headers) into objects. */
function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];
  const [header, ...data] = rows;
  return data.map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h] = r[i] ?? "";
    });
    return obj;
  });
}

/** Converts a two-column "key,value" section into a flat key->value map. */
function rowsToKeyValue(rows: string[][]): Record<string, string> {
  if (rows.length === 0) return {};
  const [, ...data] = rows; // skip the column header row
  const map: Record<string, string> = {};
  data.forEach((r) => {
    map[r[0]] = r[1] ?? "";
  });
  return map;
}

export interface ParsedAssessment {
  sessionSummary: Record<string, string>;
  readerProfile: Record<string, string>;
  segments: Record<string, string>[];
  pauses: Record<string, string>[];
  rereads: Record<string, string>[];
  speedChanges: Record<string, string>[];
  lookupsLog: Record<string, string>[];
  lookupsSummary: Record<string, string>[];
  wordDwell: Record<string, string>[];
  comprehensionAnswers: Record<string, string>[];
  comprehensionSubmittedAt: string | null;
}

export function parseAssessmentCsv(text: string): ParsedAssessment {
  const rows = parseCsvRows(text);
  const sections = splitIntoSections(rows);

  function find(title: string): string[][] {
    return sections.find((s) => s.title === title)?.rows ?? [];
  }

  const comprehensionRaw = rowsToObjects(find("COMPREHENSION ANSWERS"));
  const submittedRow = comprehensionRaw.find(
    (r) => r.question_id === "comprehension_submitted_at",
  );
  const comprehensionAnswers = comprehensionRaw.filter(
    (r) => r.question_id !== "comprehension_submitted_at",
  );

  const parsed: ParsedAssessment = {
    sessionSummary: rowsToKeyValue(find("SESSION SUMMARY")),
    readerProfile: rowsToKeyValue(find("READER PROFILE")),
    segments: rowsToObjects(find("READING SEGMENTS")),
    pauses: rowsToObjects(find("PAUSES")),
    rereads: rowsToObjects(find("REREADS")),
    speedChanges: rowsToObjects(find("SPEED CHANGES")),
    lookupsLog: rowsToObjects(find("DICTIONARY LOOKUPS (LOG)")),
    lookupsSummary: rowsToObjects(find("DICTIONARY LOOKUPS (SUMMARY BY WORD)")),
    wordDwell: rowsToObjects(find("WORD DWELL TIME (FOR HEATMAP)")),
    comprehensionAnswers,
    comprehensionSubmittedAt: submittedRow?.answer || null,
  };

  if (
    Object.keys(parsed.sessionSummary).length === 0 &&
    Object.keys(parsed.readerProfile).length === 0 &&
    parsed.wordDwell.length === 0
  ) {
    throw new Error("This doesn't look like a reading assessment CSV export.");
  }

  return parsed;
}
