'use client';

/**
 * オブジェクトリポジトリ（統一アクセス）
 *
 * 読みは「いま居る世界」から。どこから読むかは記述子の membership が決める
 * （objects/world.tsx の readScopeOf）。呼び出し側は型だけ書けばよい。
 *   - useObjects(type)        … 一覧（クエリ・購読）
 *   - useObject(type, id)     … 単体（クエリ・購読、読み取り専用）
 *   - useObjectShell(type, id)… シェル。object（現在値）と update（メソッド実行→自動保存）
 *   - useObjectRepo(type)     … 新規作成・削除（save / remove）
 *
 * 書きは commit.ts が記述子の homeScope を見て fan-out する（本籍のローカル世界線＋
 * グローバル台帳）。グローバル台帳は「全世界の最新値インデックス」で、勤務表一覧や
 * スタッフ詳細のような**世界をまたぐ問い合わせ**がここを読む。
 */
import { useMemo, useCallback } from "react";
import { useAppStore } from "@bublys-org/state-management";
import { APP_SCOPE_ID, saveObject, removeObject } from "./commit.js";
import { absentInReadScope, readScopeOf, useWorld } from "./world.js";

export { APP_SCOPE_ID };

/** 空の結果を毎回同じ配列で返すための定数（識別子を安定させる） */
const EMPTY_OBJECTS: readonly never[] = [];

/**
 * その型の全オブジェクトを取得（クエリ・購読）
 *
 * useCasScope は毎レンダー新しい scope オブジェクトを返すので、scope を依存にすると
 * 中身が変わっていなくても毎回新しい配列になる。中身が同じなら同じ配列を返すよう、
 * shells（scope 内部で memo 済み）の識別子だけに依存させる。
 * 呼び出し側がこの配列を useMemo/useEffect の依存に置けるようにするため。
 */
export function useObjects<T>(type: string): T[] {
  const world = useWorld();
  const shells = readScopeOf(world, type).shells<T>(type);
  const objects = useMemo(() => shells.map((s) => s.object), [shells]);
  return objects.length === 0 ? (EMPTY_OBJECTS as unknown as T[]) : objects;
}

/**
 * まだ状態が揃っていない（参照はあるのに実データが手元に無い）。
 *
 * メモリ上の CAS は 300 件で頭打ちなので、古い状態は追い出される。追い出されただけの
 * ものを「無い」と読んで既定値を作り直して保存すると、中身のあるオブジェクトを空で
 * 上書きしてしまう。「無ければ作る」を書くときは必ずこれで待つこと。
 */
export function useObjectsPending(): boolean {
  const world = useWorld();
  return world.here.pending || world.app.pending;
}

/**
 * IDで単体取得（クエリ・購読、読み取り専用）
 *
 * 依存は getShell（scope 内部で shells に対して memo 済み）にする。scope そのものは
 * 毎レンダー新しいオブジェクトなので、依存に置くと memo が常に無効になる。
 */
export function useObject<T>(type: string, id: string | undefined): T | undefined {
  const world = useWorld();
  const getShell = readScopeOf(world, type, id).getShell;
  return useMemo(() => {
    if (id === undefined) return undefined;
    return getShell<T>(type, id)?.object;
  }, [getShell, type, id]);
}

/**
 * シェル。object（現在値）と update（メソッド実行→自動保存）を返す。
 * update(s => s.method()) を呼ぶだけで監視している世界線すべてへ保存される。
 */
export function useObjectShell<T>(
  type: string,
  id: string | undefined
): { object: T | undefined; update: (fn: (obj: T) => T) => void } {
  const object = useObject<T>(type, id);
  const store = useAppStore();
  const update = useCallback(
    (fn: (obj: T) => T) => {
      if (object === undefined) return;
      saveObject(store, type, fn(object));
    },
    [store, type, object]
  );
  return { object, update };
}

/**
 * そのオブジェクトが「本当に無い」か。判定の中身は {@link absentInReadScope}。
 * 「読めないだけ」と区別するための番人なので、本体は純粋関数として別に置いてある。
 */
export function useIsAbsent(type: string, id: string | undefined): boolean {
  const world = useWorld();
  const store = useAppStore();
  return absentInReadScope(store, world, type, id);
}

/** 新規作成・削除（save は監視している世界線すべてへ保存） */
export function useObjectRepo<T>(type: string): {
  save: (obj: T) => void;
  remove: (id: string) => void;
} {
  const store = useAppStore();
  return useMemo(
    () => ({
      save: (obj: T) => saveObject(store, type, obj),
      remove: (id: string) => removeObject(store, type, id),
    }),
    [store, type]
  );
}
