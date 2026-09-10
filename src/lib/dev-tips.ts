// Curated dev-habit tips — rotates once per day (UTC), same day-of-year
// index for every viewer so it's consistent, no network call needed.
// No backend "tips" API exists today; this is a deliberate frontend-only
// list per product decision, not a stopgap for a missing endpoint.
export const DEV_TIPS: string[] = [
  "Give it just 10 minutes a day — come back in 30 days and see the difference. That's enough time to genuinely learn Git.",
  "Commit early, commit often. Small commits are easier to review, revert, and understand later.",
  "Read the error message twice before searching for it — the answer is often right there.",
  "Write the README before you write the code. It forces you to think through what you're actually building.",
  "A pull request that does one thing is easier to review than one that does five.",
  "Learn one keyboard shortcut a week in your editor — they compound fast.",
  "`git log --oneline --graph` is a great habit before touching a branch you don't fully understand.",
  "Naming things well is half of good code. If a name needs a comment to explain it, rename it.",
  "Break a big task into steps small enough that each one takes under 30 minutes.",
  "Ask 'what breaks if this input is empty/null/huge?' before you ship a function.",
  "Rubber duck it — explaining the bug out loud (even to no one) often reveals the fix.",
  "Consistency beats intensity. Showing up daily for a short session builds more skill than one long weekend push.",
  "Review your own diff before asking someone else to. You'll catch half the issues yourself.",
  "Keep a running list of things you don't understand yet — revisit it monthly, you'll be surprised how much clicks.",
  "Write the test that fails first, then make it pass. It's a faster feedback loop than it looks.",
];

// UTC day-of-year, stable across timezones so everyone sees the same tip on
// the same calendar day.
function dayOfYearUTC(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const diff = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - start;
  return Math.floor(diff / 86400000);
}

export function getTodaysTip(): string {
  const idx = dayOfYearUTC(new Date()) % DEV_TIPS.length;
  return DEV_TIPS[idx];
}
