import type { ShiftCell } from "@bublys-org/hotel-shift-puzzle-model";
import type { RankCellCandidatesArgs, PolicyShiftSuggestion, ShiftSuggestionPolicy } from "./types.js";
import {
  buildCellCandidateFeatures,
  enumerateCellCandidates,
  featuresToVector,
  FEATURE_NAMES,
  suggestionIdFor,
  type CellCandidateFeatures,
} from "./cellFeatures.js";

export type ShiftPolicyWeights = {
  bias: number;
  weights: number[];
  version?: string;
  featureNames?: string[];
};

function dot(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) sum += a[i] * b[i];
  return sum;
}

function topPositiveFeatureReasons(
  f: CellCandidateFeatures,
  weights: number[],
  featureNames: readonly string[]
): string[] {
  const vector = featuresToVector(f);
  const ranked = vector
    .map((value, i) => ({
      name: featureNames[i] ?? FEATURE_NAMES[i] ?? `f${i}`,
      contribution: value * (weights[i] ?? 0),
    }))
    .filter((x) => x.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 2)
    .map((x) => x.name);
  return ranked;
}

const FEATURE_LABEL: Record<string, string> = {
  wishMatch: "希望一致",
  fillsDemand: "需要充足",
  availabilityOk: "可能勤務帯",
  linkedReportScore: "貢献度",
  isBusyDay: "繁忙日",
  isDayOff: "休み",
  isUndecided: "未定",
  wouldConcede: "譲歩",
};

export class LearnedSuggestionPolicy implements ShiftSuggestionPolicy {
  constructor(private readonly model: ShiftPolicyWeights | null) {}

  rankCellCandidates(args: RankCellCandidatesArgs): PolicyShiftSuggestion[] {
    if (!this.model || this.model.weights.length === 0) return [];

    const featureNames = this.model.featureNames ?? FEATURE_NAMES;
    const maxLinked = Math.max(1, args.linkedReportScoreOf?.(args.staffId) ?? 1);
    const candidates = enumerateCellCandidates(args.workShifts);

    const ranked: PolicyShiftSuggestion[] = candidates.map((cell: ShiftCell) => {
      const features = buildCellCandidateFeatures({
        ...args,
        cell,
        maxLinkedReportScore: maxLinked,
      });
      const score =
        this.model!.bias + dot(featuresToVector(features), this.model!.weights);
      const topFeatures = topPositiveFeatureReasons(
        features,
        this.model!.weights,
        featureNames
      ).map((n) => FEATURE_LABEL[n] ?? n);
      const reasons = ["学習モデル", ...topFeatures];
      return {
        id: suggestionIdFor(args.staffId, args.day.key, cell),
        cell,
        score,
        reasons,
        wouldConcede: features.wouldConcede > 0,
      };
    });

    ranked.sort((a, b) => b.score - a.score);
    return ranked;
  }
}
