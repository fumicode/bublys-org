import type { ShiftCell } from "@bublys-org/hotel-shift-puzzle-model";
import type { RankCellCandidatesArgs, PolicyShiftSuggestion, ShiftSuggestionPolicy } from "./types.js";
import {
  buildCellCandidateFeatures,
  enumerateCellCandidates,
  suggestionIdFor,
  type CellCandidateFeatures,
} from "./cellFeatures.js";

function heuristicScore(f: CellCandidateFeatures): number {
  return (
    f.wishMatch * 10 +
    f.fillsDemand * 5 +
    f.availabilityOk * 2 +
    f.linkedReportScore * 0.5 +
    f.isBusyDay * f.fillsDemand * 3 -
    f.wouldConcede * 8 -
    (f.availabilityOk === 0 ? 20 : 0)
  );
}

function reasonsFromFeatures(f: CellCandidateFeatures): string[] {
  const reasons: string[] = [];
  if (f.wishMatch > 0) reasons.push("希望に一致");
  if (f.fillsDemand > 0) reasons.push("人手不足を埋める");
  if (f.isBusyDay > 0 && f.fillsDemand > 0) reasons.push("繁忙日の需要");
  if (f.linkedReportScore > 0) reasons.push("前回の貢献度が高い");
  if (f.availabilityOk === 0) reasons.push("可能勤務帯外");
  if (f.wouldConcede > 0) reasons.push("制約上の譲歩が必要");
  if (f.isUndecided > 0) reasons.push("未定（低優先）");
  if (reasons.length === 0) reasons.push("ヒューリスティック");
  return reasons;
}

function maxLinkedScore(
  staffId: string,
  linkedReportScoreOf?: (staffId: string) => number
): number {
  if (!linkedReportScoreOf) return 1;
  return Math.max(1, linkedReportScoreOf(staffId));
}

export class HeuristicSuggestionPolicy implements ShiftSuggestionPolicy {
  rankCellCandidates(args: RankCellCandidatesArgs): PolicyShiftSuggestion[] {
    const maxLinked = maxLinkedScore(args.staffId, args.linkedReportScoreOf);
    const candidates = enumerateCellCandidates(args.workShifts);

    const ranked: PolicyShiftSuggestion[] = candidates.map((cell: ShiftCell) => {
      const features = buildCellCandidateFeatures({
        ...args,
        cell,
        maxLinkedReportScore: maxLinked,
      });
      const score = heuristicScore(features);
      return {
        id: suggestionIdFor(args.staffId, args.day.key, cell),
        cell,
        score,
        reasons: reasonsFromFeatures(features),
        wouldConcede: features.wouldConcede > 0,
      };
    });

    ranked.sort((a, b) => b.score - a.score);
    return ranked;
  }
}
