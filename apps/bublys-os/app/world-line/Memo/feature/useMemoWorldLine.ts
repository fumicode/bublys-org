"use client";
import { useEffect, useRef } from "react";
import { useCasScope } from "@bublys-org/world-line-graph";
import { Memo } from "../domain/Memo";
import { MEMO_TYPE, memoScopeId } from "../domain/MemoDomain";

/**
 * 1 memo につき 1 scope の world-line を提供するフック。
 *
 * 仕組み:
 *  - `useCasScope("memo:<memoId>")` で memo 専用 scope を確保
 *  - 既存 memo 状態が無ければ `initialMemo` で初期 shell を作る
 *  - 編集 API（`update`）は shell.update を呼んで graph を伸ばす
 *  - `apexMemo` は scope の apex に紐づく最新の Memo を返す
 *  - 戻る/進む / 任意ノードへの moveTo / graph 全体は scope のものを露出
 *
 * 注: DomainRegistryProvider の内側で使うこと（MEMO_TYPE を解決するため）。
 */
export type MemoWorldLine = {
  memoId: string;
  apexMemo: Memo | null;
  update: (transform: (current: Memo) => Memo) => void;
  moveBack: () => void;
  moveForward: () => void;
  moveTo: (nodeId: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  graph: ReturnType<typeof useCasScope>["graph"];
  scope: ReturnType<typeof useCasScope>;
};

export function useMemoWorldLine(memoId: string, initialMemo?: Memo): MemoWorldLine {
  const scope = useCasScope(memoScopeId(memoId), {
    initialObjects: initialMemo ? [{ type: MEMO_TYPE, object: initialMemo }] : [],
  });

  // 初期化が必要だが initialMemo は呼び出し時点で決まらない（後段で書く編集が
  // 優先される）ので、初回マウントに shell が無ければここでも追加しておく。
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    const shell = scope.getShell<Memo>(MEMO_TYPE, memoId);
    if (!shell && initialMemo) {
      scope.addObject(MEMO_TYPE, initialMemo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apexMemo = scope.getShell<Memo>(MEMO_TYPE, memoId)?.object ?? null;

  const update = (transform: (current: Memo) => Memo) => {
    const shell = scope.getShell<Memo>(MEMO_TYPE, memoId);
    if (shell) {
      shell.update(transform);
    } else {
      // 初期 shell が未注入。transform に「空入力」を渡せないので何もしない。
    }
  };

  return {
    memoId,
    apexMemo,
    update,
    moveBack: scope.moveBack,
    moveForward: scope.moveForward,
    moveTo: scope.moveTo,
    canUndo: scope.canUndo,
    canRedo: scope.canRedo,
    graph: scope.graph,
    scope,
  };
}
