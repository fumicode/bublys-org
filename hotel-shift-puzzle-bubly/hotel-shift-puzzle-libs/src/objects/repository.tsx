'use client';

/**
 * オブジェクトリポジトリ（統一アクセス）
 *
 * 全ドメインオブジェクトはアプリ全体の世界線スコープ（CAS）に載る。取得は世界線を意識しない。
 *   - useObjects(type)        … 一覧（クエリ・購読）
 *   - useObject(type, id)     … 単体（クエリ・購読、読み取り専用）
 *   - useObjectShell(type, id)… シェル。object（現在値）と update（メソッド実行→自動保存）
 *   - useObjectRepo(type)     … 新規作成・削除（save / remove）
 *
 * 編集はシェル経由：update(s => s.method()) を呼ぶだけで、その型を「監視している世界線
 * すべて」（アプリ全体＋ localHistory のローカル）へ自動保存される（commit.ts が fan-out）。
 */
import { useMemo, useCallback } from "react";
import { useCasScope } from "@bublys-org/world-line-graph";
import { useAppStore } from "@bublys-org/state-management";
import { APP_SCOPE_ID, saveObject, removeObject } from "./commit.js";

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
  const scope = useCasScope(APP_SCOPE_ID);
  const shells = scope.shells<T>(type);
  const objects = useMemo(() => shells.map((s) => s.object), [shells]);
  return objects.length === 0 ? (EMPTY_OBJECTS as unknown as T[]) : objects;
}

/** IDで単体取得（クエリ・購読、読み取り専用） */
export function useObject<T>(type: string, id: string | undefined): T | undefined {
  const scope = useCasScope(APP_SCOPE_ID);
  return useMemo(() => {
    if (id === undefined) return undefined;
    return scope.getShell<T>(type, id)?.object;
  }, [scope, type, id]);
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
