"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDemographicsStore, type ReadingDifficulty } from "./stores";

const DIFFICULTY_OPTIONS: { id: ReadingDifficulty; label: string }[] = [
  { id: "blurry-vision", label: "Blurry vision" },
  { id: "dyslexia", label: "Dyslexia" },
  { id: "hyperlexia", label: "Hyperlexia" },
  { id: "adhd", label: "Attention Deficit Hyperactivity Disorder (ADHD)" },
  { id: "apd", label: "Auditory Processing Disorder (APD)" },
  { id: "language-processing-disorder", label: "Language Processing Disorder" },
  { id: "alexia", label: "Alexia" },
  {
    id: "visual-perceptual-motor-deficit",
    label: "Visual Perceptual/Visual-Motor Deficit",
  },
  { id: "other", label: "Other" },
];

export default function DemographicsForm() {
  const router = useRouter();
  const profile = useDemographicsStore((s) => s.profile);
  const setField = useDemographicsStore((s) => s.setField);
  const toggleDifficulty = useDemographicsStore((s) => s.toggleDifficulty);
  const submitProfile = useDemographicsStore((s) => s.submitProfile);

  const [touched, setTouched] = useState(false);

  const isValid =
    profile.name.trim() && profile.level.trim() && profile.section.trim();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;

    submitProfile();
    router.push("/system-test");
  }

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-card border border-panel-border rounded-lg shadow-sm p-8">
        <div className="mb-8">
          <h1 className="font-reading text-2xl font-semibold text-foreground">
            Reader Profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A few details help us tailor the reading session to you.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={profile.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Full name"
              className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {touched && !profile.name.trim() && (
              <p className="mt-1 text-xs text-destructive">Name is required.</p>
            )}
          </div>

          {/* Level + Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="level"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Level
              </label>
              <input
                id="level"
                type="text"
                value={profile.level}
                onChange={(e) => setField("level", e.target.value)}
                placeholder="e.g. Grade 11"
                className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {touched && !profile.level.trim() && (
                <p className="mt-1 text-xs text-destructive">Required.</p>
              )}
            </div>

            <div>
              <label
                htmlFor="section"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Section
              </label>
              <input
                id="section"
                type="text"
                value={profile.section}
                onChange={(e) => setField("section", e.target.value)}
                placeholder="e.g. Narra"
                className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {touched && !profile.section.trim() && (
                <p className="mt-1 text-xs text-destructive">Required.</p>
              )}
            </div>
          </div>

          {/* Reading difficulties */}
          <div>
            <span className="block text-sm font-medium text-foreground mb-1.5">
              Reading difficulties
            </span>
            <p className="text-xs text-muted-foreground mb-2.5">
              Select any that apply. This is optional.
            </p>

            <div className="space-y-2">
              {DIFFICULTY_OPTIONS.map((opt) => {
                const checked = profile.difficulties.includes(opt.id);
                return (
                  <div key={opt.id}>
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDifficulty(opt.id)}
                        className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                      />
                      <span className="text-sm text-foreground">
                        {opt.label}
                      </span>
                    </label>

                    {opt.id === "other" && checked && (
                      <input
                        type="text"
                        value={profile.otherDifficultyDetail}
                        onChange={(e) =>
                          setField("otherDifficultyDetail", e.target.value)
                        }
                        placeholder="Please specify"
                        className="mt-2 ml-6 w-[calc(100%-1.5rem)] px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Other concerns */}
          <div>
            <label
              htmlFor="concerns"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Any other concerns
            </label>
            <textarea
              id="concerns"
              value={profile.concerns}
              onChange={(e) => setField("concerns", e.target.value)}
              placeholder="Share anything else that would help us support this reader…"
              rows={4}
              className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Continue to system test
          </button>
        </form>
      </div>
    </div>
  );
}
