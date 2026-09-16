// Computed client-side from data already fetched on the Dashboard — there is
// no native "XP" field in the backend, so this blends the real signals we do
// have (streak, attendance, weekly-challenge progress, org rank) into a
// single 0-100 score. Weights: attendance is the strongest daily-presence
// signal (40%), streak rewards consistency over time (30%, capped at a
// 30-day streak so it saturates rather than growing unbounded), the active
// weekly challenge is a short-term goal (20%), and org rank is a relative
// nice-to-have (10%, omitted from the average when no ranking exists yet).
export interface EngagementScoreInput {
  currentStreak: number;
  attendancePercentage: number; // 0-100
  weeklyChallengeProgress: number | null; // 0-1 ratio, null if no active challenge
  rank?: number | null;
  totalParticipants?: number | null;
}

const STREAK_CAP_DAYS = 30;

export function computeEngagementScore(input: EngagementScoreInput): number {
  const streakScore = Math.min(input.currentStreak / STREAK_CAP_DAYS, 1) * 100;
  const attendanceScore = Math.min(Math.max(input.attendancePercentage, 0), 100);
  const challengeScore = input.weeklyChallengeProgress !== null
    ? Math.min(Math.max(input.weeklyChallengeProgress, 0), 1) * 100
    : null;
  const rankScore =
    input.rank && input.totalParticipants && input.totalParticipants > 0
      ? Math.min(Math.max(1 - (input.rank - 1) / input.totalParticipants, 0), 1) * 100
      : null;

  const weighted: Array<{ score: number; weight: number }> = [
    { score: streakScore, weight: 0.3 },
    { score: attendanceScore, weight: 0.4 },
  ];
  if (challengeScore !== null) weighted.push({ score: challengeScore, weight: 0.2 });
  if (rankScore !== null) weighted.push({ score: rankScore, weight: 0.1 });

  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  const total = weighted.reduce((sum, w) => sum + w.score * w.weight, 0);
  return Math.round(total / totalWeight);
}

export function engagementScoreBand(score: number): { label: string; colorClass: string } {
  if (score >= 80) return { label: "Excellent", colorClass: "text-emerald-500" };
  if (score >= 60) return { label: "Good", colorClass: "text-primary" };
  if (score >= 40) return { label: "Fair", colorClass: "text-amber-500" };
  return { label: "Needs a push", colorClass: "text-destructive" };
}
