'use client';

/**
 * useScheduleHistory — 勤務表ごとのローカル世界線（ビュー用）
 *
 * 「いま居る世界」をそのまま返すだけ。**時間移動は scope.moveTo(nodeId) で完結する。**
 *
 * 以前はここに restore があった。読みがアプリ全体スコープ決め打ちだったので、
 * ローカル世界線を moveTo しても画面が変わらず、
 *   moveTo → resolveObjectsAt（非同期）→ 全オブジェクトを APP へ書き戻す
 *   → 勤務表が載っていなければ warn → EditLog が無ければ空ログを APP へ
 * という橋渡しが必要だった。読みもこの世界からになったので、①以外は全部不要になった。
 * （囲碁など他のバブリに restore 相当が無いのは、最初から読みがスコープからだったため）
 *
 * ScheduleWorld の中で呼ぶこと。
 */
import type { CasScopeValue } from "@bublys-org/world-line-graph";
import { useWorld } from "../objects/world.js";

export function useScheduleHistory(): { scope: CasScopeValue } {
  const { here } = useWorld();
  return { scope: here };
}
