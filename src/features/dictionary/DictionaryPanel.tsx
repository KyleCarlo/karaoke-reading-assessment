"use client";

import { useEffect, useRef } from "react";
import { useDictionaryStore } from "./stores";
import { useReadingStore } from "@/features/reading/stores";

export default function DictionaryPanel() {
  const query = useDictionaryStore((s) => s.query);
  const entry = useDictionaryStore((s) => s.entry);
  const loading = useDictionaryStore((s) => s.loading);
  const error = useDictionaryStore((s) => s.error);
  const setQuery = useDictionaryStore((s) => s.setQuery);
  const lookup = useDictionaryStore((s) => s.lookup);

  const pause = useReadingStore((s) => s.pause);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    pause();

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value.trim()) lookup(value);
    }, 500);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    pause();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim()) lookup(query);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Dictionary
      </h2>

      <form onSubmit={handleSubmit} className="mb-4">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search a word…"
          className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </form>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <p className="text-sm text-muted-foreground animate-pulse">
            Looking up…
          </p>
        )}

        {!loading && error && (
          <p className="text-sm text-muted-foreground">{error}</p>
        )}

        {!loading && !error && entry && (
          <div className="space-y-4">
            <div>
              <h3 className="font-reading text-xl font-semibold text-foreground">
                {entry.word}
              </h3>
              {entry.phonetic && (
                <span className="text-sm text-muted-foreground">
                  {entry.phonetic}
                </span>
              )}
            </div>

            {entry.meanings.map((meaning, mi) => (
              <div key={mi}>
                <span className="text-xs font-medium uppercase tracking-wide text-primary">
                  {meaning.partOfSpeech}
                </span>
                <ol className="mt-1 space-y-2">
                  {meaning.definitions.map((def, di) => (
                    <li key={di} className="text-sm leading-relaxed">
                      <span className="text-muted-foreground mr-1">
                        {di + 1}.
                      </span>
                      {def.definition}
                      {def.example && (
                        <p className="mt-1 text-xs text-muted-foreground italic font-reading">
                          &ldquo;{def.example}&rdquo;
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && !entry && (
          <p className="text-sm text-muted-foreground">
            Click a word in the text or type above to look it up.
          </p>
        )}
      </div>
    </div>
  );
}
