import type { RankCellCandidatesArgs, PolicyShiftSuggestion, ShiftSuggestionPolicy } from "./types.js";

function normalizeScores(scores: number[]): number[] {
  if (scores.length === 0) return [];
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max === min) return scores.map(() => 1);
  return scores.map((s) => (s - min) / (max - min));
}

function mergeReasons(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of [...a, ...b]) {
    if (!seen.has(r)) {
      seen.add(r);
      out.push(r);
    }
  }
  return out;
}

export class CompositeSuggestionPolicy implements ShiftSuggestionPolicy {
  constructor(
    private readonly heuristic: ShiftSuggestionPolicy,
    private readonly learned?: ShiftSuggestionPolicy | null
  ) {}

  rankCellCandidates(args: RankCellCandidatesArgs): PolicyShiftSuggestion[] {
    const heuristicRanked = this.heuristic.rankCellCandidates(args);
    const learnedRanked = this.learned?.rankCellCandidates(args) ?? [];

    if (learnedRanked.length === 0) return heuristicRanked;

    const hById = new Map(heuristicRanked.map((s) => [s.id, s]));
    const lById = new Map(learnedRanked.map((s) => [s.id, s]));
    const ids = [...new Set([...hById.keys(), ...lById.keys()])];

    const hNorm = normalizeScores(ids.map((id) => hById.get(id)?.score ?? 0));
    const lNorm = normalizeScores(ids.map((id) => lById.get(id)?.score ?? 0));

    const blended: PolicyShiftSuggestion[] = ids.map((id, i) => {
      const h = hById.get(id);
      const l = lById.get(id);
      const cell = (l ?? h)!;
      const score = 0.6 * lNorm[i] + 0.4 * hNorm[i];
      return {
        id,
        cell: cell.cell,
        score,
        reasons: mergeReasons(h?.reasons ?? [], l?.reasons ?? []),
        wouldConcede: (h?.wouldConcede ?? false) || (l?.wouldConcede ?? false),
      };
    });

    blended.sort((a, b) => b.score - a.score);
    return blended;
  }
}
