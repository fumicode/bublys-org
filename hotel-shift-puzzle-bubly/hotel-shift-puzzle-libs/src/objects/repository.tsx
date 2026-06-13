'use client';

/**
 * オブジェクトリポジトリ（統一アクセス）
 *
 * 全ドメインオブジェクトは「アプリ全体の世界線スコープ（CAS）」1つに載る。
 * Redux に独立の per-domain スライスや射影は持たない（CAS 自体が worldLineGraph slice
 * として永続化されるため、それを直接読む）。取得は世界線を一切意識しない:
 *   - useObjects(type)        … 一覧（クエリ・購読）
 *   - useObject(type, id)     … 単体（クエリ・購読）
 *   - useObjectRepo(type)  … save / remove / setAll（コマンド・命令）
 *
 * save するだけで自動的に世界線に記録される（= どのオブジェクトでも後から戻せる）。
 * 「repository」は React hook ではなく、裏側の世界線CASストアの概念名。
 */
import { useMemo } from "react";
import { useCasScope } from "@bublys-org/world-line-graph";

/** アプリ全体の世界線スコープID */
export const APP_SCOPE_ID = "hotel";

/** その型の全オブジェクトを取得（クエリ・購読） */
export function useObjects<T>(type: string): T[] {
  const scope = useCasScope(APP_SCOPE_ID);
  return useMemo(
    () => scope.shells<T>(type).map((s) => s.object),
    // scope は更新毎に変わるため毎回再計算（小規模なので許容。必要なら後でメモ化）
    [scope, type]
  );
}

/** IDで単体取得（クエリ・購読。無ければ undefined） */
export function useObject<T>(type: string, id: string | undefined): T | undefined {
  const scope = useCasScope(APP_SCOPE_ID);
  return useMemo(() => {
    if (id === undefined) return undefined;
    return scope.getShell<T>(type, id)?.object;
  }, [scope, type, id]);
}

/** その型への命令（保存・削除・一括投入）。save は自動で世界線に記録される */
export function useObjectRepo<T>(type: string): {
  save: (obj: T) => void;
  remove: (id: string) => void;
  setAll: (objs: T[]) => void;
} {
  const scope = useCasScope(APP_SCOPE_ID);
  return useMemo(
    () => ({
      save: (obj: T) => scope.addObject(type, obj),
      remove: (id: string) => scope.removeObject(type, id),
      // 1回の grow でまとめて追加（forEach addObject は stale graph で上書きし合うため不可）
      setAll: (objs: T[]) =>
        scope.addObjects(objs.map((obj) => ({ type, object: obj }))),
    }),
    [scope, type]
  );
}
