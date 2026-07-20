import type { ShiftPolicyWeights } from "./learnedPolicy.js";

/**
 * Vite アプリの public/models から学習済み重みを読み込む。
 * 取得失敗時は null（ヒューリスティックのみにフォールバック）。
 */
export async function loadShiftPolicyWeights(): Promise<ShiftPolicyWeights | null> {
  try {
    const res = await fetch("/models/shift-policy-weights.json");
    if (!res.ok) return null;
    const data = (await res.json()) as ShiftPolicyWeights;
    if (!Array.isArray(data.weights) || data.weights.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}
