"use client";

import { useState } from "react";
import Link from "next/link";

interface Question {
  id: string;
  category: string;
  prompt: string;
}

const QUESTIONS: Question[] = [
  {
    id: "q1",
    category: "Literal comprehension",
    prompt:
      "What did Mara discover in the old blue book, and what information did it contain about the town's past?",
  },
  {
    id: "q2",
    category: "Inferential comprehension",
    prompt:
      "Why did Mara begin to suspect that the town's current drainage problems might be connected to events described in the old records?",
  },
  {
    id: "q3",
    category: "Critical/inferential comprehension",
    prompt:
      'What does Mr. Elias mean when he says that communities can "lose useful knowledge when people stop preserving their experiences"? Explain using evidence from the story.',
  },
  {
    id: "q4",
    category: "Analysis",
    prompt:
      "How did the students' understanding of the town change after they compared the historical photographs, maps, and written records with the town's present condition?",
  },
  {
    id: "q5",
    category: "Higher-order/inferential comprehension",
    prompt:
      'What is the significance of the "last light" in the title and at the end of the story? What larger message does it communicate about preserving history and knowledge?',
  },
];

export default function ComprehensionTestPage() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState(false);

  const allAnswered = QUESTIONS.every((q) => answers[q.id]?.trim());

  function handleChange(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
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
            Answer the following questions about &ldquo;The Last Light in the
            Library&rdquo; in your own words.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-7">
          {QUESTIONS.map((q, qi) => {
            const value = answers[q.id] ?? "";
            const isEmpty = touched && !value.trim();
            return (
              <div key={q.id}>
                <span className="block text-xs font-medium uppercase tracking-wide text-primary mb-1">
                  {q.category}
                </span>
                <label
                  htmlFor={q.id}
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {qi + 1}. {q.prompt}
                </label>
                <textarea
                  id={q.id}
                  value={value}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  placeholder="Write your answer…"
                  rows={4}
                  disabled={submitted}
                  className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-60"
                />
                {isEmpty && (
                  <p className="mt-1 text-xs text-destructive">
                    An answer is required.
                  </p>
                )}
              </div>
            );
          })}

          <button
            type="submit"
            disabled={submitted}
            className="w-full px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Submit answers
          </button>
        </form>
      </div>

      {submitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

          {/* Modal */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="submission-confirmation-title"
            className="relative w-full max-w-md bg-card border border-panel-border rounded-lg shadow-lg p-8 text-center"
          >
            <h2
              id="submission-confirmation-title"
              className="font-reading text-xl font-semibold text-foreground mb-2"
            >
              Thank you for participating!
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Your responses have been recorded. That completes the reading
              assessment.
            </p>

            <Link
              href="/"
              className="block w-full text-center px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Finish
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
