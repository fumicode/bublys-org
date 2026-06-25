/**
 * AUTO_SHIFT_STEPS — 段階的に実行できる自動シフトのステップ一覧（実行順）。
 *
 * UI はこのリストをそのままボタンとして並べ、ユーザーが好きな段階を好きな順で実行する。
 * 新しいコマンドを足すときは AutoShiftStep を実装してこの配列に加えるだけ。
 */
import type { AutoShiftStep } from "./autoShiftStep.js";
import { fulfillWishesStep } from "./fulfillWishesStep.js";
import { fillDemandStep } from "./fillDemandStep.js";

export const AUTO_SHIFT_STEPS: AutoShiftStep[] = [fulfillWishesStep, fillDemandStep];
