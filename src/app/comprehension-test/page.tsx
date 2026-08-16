"use client";

import { useState } from "react";
import Link from "next/link";

interface Question {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

const QUESTIONS: Question[] = [
  {
    id: "q1",
    prompt: "What was the Ant doing when it came across the Chrysalis?",
    options: [
      "Sleeping under a tree",
      "Searching for food",
      "Building a nest",
      "Racing another insect",
    ],
    correctIndex: 1,
  },
  {
    id: "q2",
    prompt: "How did the Ant treat the Chrysalis at first?",
    options: [
      "With kindness and curiosity",
      "With scorn and mockery",
      "With fear",
      "With complete indifference",
    ],
    correctIndex: 1,
  },
  {
    id: "q3",
    prompt: "What did the Ant find when it passed by again a few days later?",
    options: [
      "The Chrysalis had grown legs",
      "Nothing but the empty shell",
      "The Chrysalis had disappeared entirely",
      "Another ant had taken its place",
    ],
    correctIndex: 1,
  },
  {
    id: "q4",
    prompt: 'Who revealed itself as the Ant\u2019s "much-pitied friend"?',
    options: ["A bird", "A butterfly", "A beetle", "A bee"],
    correctIndex: 1,
  },
  {
    id: "q5",
    prompt: "What lesson does this fable teach?",
    options: [
      "Slow and steady wins the race",
      "Don't judge others by their current circumstances",
      "Honesty is always the best policy",
      "Actions speak louder than words",
    ],
    correctIndex: 1,
  },
];

export default function ComprehensionTestPage() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = QUESTIONS.every((q) => answers[q.id] !== undefined);
  const score = QUESTIONS.filter(
    (q) => answers[q.id] === q.correctIndex,
  ).length;

  function handleSelect(questionId: string, optionIndex: number) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allAnswered) return;
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl bg-card border border-panel-border rounded-lg shadow-sm p-8">
        <div className="mb-8">
          <h1 className="font-reading text-2xl font-semibold text-foreground">
            Comprehension Test
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Answer these questions about &ldquo;The Ant and the Chrysalis&rdquo;
            to check your understanding.
          </p>
        </div>

        {submitted && (
          <div className="mb-6 px-4 py-3 rounded-md bg-secondary text-secondary-foreground text-sm font-medium">
            You scored {score} out of {QUESTIONS.length}.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-7">
          {QUESTIONS.map((q, qi) => {
            const selected = answers[q.id];
            return (
              <fieldset key={q.id}>
                <legend className="text-sm font-medium text-foreground mb-2.5">
                  {qi + 1}. {q.prompt}
                </legend>

                <div className="space-y-2">
                  {q.options.map((option, oi) => {
                    const isSelected = selected === oi;
                    const isCorrect = oi === q.correctIndex;

                    let optionClasses =
                      "flex items-center gap-2.5 px-3 py-2 rounded-md border text-sm cursor-pointer transition-colors";

                    if (submitted) {
                      optionClasses += " cursor-default";
                      if (isCorrect) {
                        optionClasses +=
                          " border-primary bg-primary/10 text-foreground";
                      } else if (isSelected && !isCorrect) {
                        optionClasses +=
                          " border-destructive bg-destructive/10 text-foreground";
                      } else {
                        optionClasses += " border-border text-foreground";
                      }
                    } else {
                      optionClasses += isSelected
                        ? " border-primary bg-primary/10 text-foreground"
                        : " border-border text-foreground hover:bg-highlight/30";
                    }

                    return (
                      <label key={oi} className={optionClasses}>
                        <input
                          type="radio"
                          name={q.id}
                          checked={isSelected}
                          onChange={() => handleSelect(q.id, oi)}
                          disabled={submitted}
                          className="h-4 w-4 accent-primary cursor-pointer"
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          {!submitted ? (
            <button
              type="submit"
              disabled={!allAnswered}
              className="w-full px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit answers
            </button>
          ) : (
            <Link
              href="/"
              className="block w-full text-center px-4 py-2.5 rounded-md bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Finish
            </Link>
          )}
        </form>
      </div>
    </div>
  );
}
