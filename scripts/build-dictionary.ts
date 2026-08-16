/**
 * Run this locally (has real internet access, unlike a sandboxed build):
 *
 *   npx tsx scripts/build-dictionary.ts
 *
 * It reads every passage in src/lib/utils.ts, extracts the unique words
 * actually used, and looks up only the ones not already present in
 * public/dictionary/passage-words.json against api.dictionaryapi.dev.
 *
 * This makes it safe (and cheap) to re-run: words already resolved in a
 * previous run are skipped, so you can run it again and again until every
 * word has been found — only the still-missing words get fetched each time.
 *
 * Re-run this any time you add or change a passage, too. It's polite about
 * rate limits (150ms between requests) and only touches words your app
 * actually needs, so the output file stays tiny (tens of KB, not MBs).
 */

import fs from "fs";
import path from "path";
import { SAMPLE_TEXT, SYSTEM_TEST_TEXT } from "../src/lib/utils";

interface DictionaryDefinition {
  definition: string;
  example?: string;
}

interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
}

interface DictionaryEntry {
  word: string;
  phonetic?: string;
  meanings: DictionaryMeaning[];
}

// Add any other passage text constants here as your app grows.
const ALL_TEXT = [SAMPLE_TEXT, SYSTEM_TEST_TEXT].join("\n");

const OUT_PATH = path.join(
  process.cwd(),
  "public",
  "dictionary",
  "passage-words.json",
);

function extractWords(text: string): string[] {
  const words = text
    .split(/[^a-zA-Z']+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 1);
  return Array.from(new Set(words));
}

function loadExisting(): Record<string, DictionaryEntry> {
  if (!fs.existsSync(OUT_PATH)) return {};
  try {
    const raw = fs.readFileSync(OUT_PATH, "utf-8");
    return JSON.parse(raw) as Record<string, DictionaryEntry>;
  } catch {
    console.warn(
      `Warning: couldn't parse existing ${OUT_PATH}, starting fresh.`,
    );
    return {};
  }
}

async function fetchDefinition(word: string): Promise<DictionaryEntry | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
        word,
      )}`,
    );
    if (!res.ok) return null;

    const data = await res.json();
    const first = data[0];

    return {
      word: first.word,
      phonetic:
        first.phonetic ||
        first.phonetics?.find((p: { text?: string }) => p.text)?.text,
      meanings: (first.meanings || []).map(
        (m: {
          partOfSpeech: string;
          definitions: { definition: string; example?: string }[];
        }) => ({
          partOfSpeech: m.partOfSpeech,
          definitions: (m.definitions || []).slice(0, 4).map((d) => ({
            definition: d.definition,
            example: d.example,
          })),
        }),
      ),
    };
  } catch {
    return null;
  }
}

async function main() {
  const words = extractWords(ALL_TEXT);
  const existing = loadExisting();

  const alreadyResolved = words.filter((w) => existing[w]);
  const toFetch = words.filter((w) => !existing[w]);

  console.log(`Found ${words.length} unique words across all passages.`);
  console.log(
    `${alreadyResolved.length} already in ${path.basename(
      OUT_PATH,
    )} — skipping those.`,
  );
  console.log(`${toFetch.length} left to look up.\n`);

  const result: Record<string, DictionaryEntry> = { ...existing };
  const stillMissing: string[] = [];

  for (let i = 0; i < toFetch.length; i++) {
    const word = toFetch[i];
    process.stdout.write(
      `\r(${i + 1}/${toFetch.length}) looking up "${word}"...          `,
    );

    const entry = await fetchDefinition(word);
    if (entry) {
      result[word] = entry;
    } else {
      stillMissing.push(word);
    }

    // Be polite to the free API — small delay between requests.
    await new Promise((r) => setTimeout(r, 150));
  }

  const totalResolved = Object.keys(result).length;
  console.log(`\n\nResolved ${totalResolved}/${words.length} words total.`);

  if (stillMissing.length) {
    console.log(
      `\n${stillMissing.length} word(s) still have no match (often inflected forms — the app's stemming fallback will try to resolve these to a base form at runtime). Run the script again later to retry them:`,
    );
    console.log(stillMissing.join(", "));
  } else {
    console.log("\nEvery word resolved. Nothing left to retry.");
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(result));

  const sizeKb = (fs.statSync(OUT_PATH).size / 1024).toFixed(1);
  console.log(`\nWrote ${OUT_PATH} (${sizeKb} KB)`);
}

main();
