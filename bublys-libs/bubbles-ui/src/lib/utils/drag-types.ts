import React from "react";
import { getAllDragTypes } from "@bublys-org/object-types";

/**
 * ドラッグ＆ドロップ用のユーティリティ
 * 具体的な型は ObjectTypeRegistry に登録され、ここでは汎用的な仕組みを提供
 */

export const DRAG_KEYS = {
  url: "url",
  label: "label",
  objectId: "object-id",
  sourceBubbleId: "source-bubble-id",
} as const;

// 特殊な組み込みドラッグ型
export const BUILTIN_DRAG_TYPES = {
  generic: "type/generic",
} as const;

export type DragDataType = string;
export type DragPayload = {
  type: DragDataType;
  url: string;
  label?: string;
  objectId?: string;
  /**
   * ドラッグ元のバブルID。宇宙に落ちたときに「どこから出てきたか」を繋ぐのに使う。
   * この文書の中でしか意味を持たない値なので、使う側は必ず実在確認すること
   * （別ウィンドウからのドラッグでは他文書のIDが届く）。
   */
  sourceBubbleId?: string;
};

/**
 * **この荷物が名乗っている型**（`type/...`）。知らない型でも返す。
 *
 * ★ `getDragDataTypeList()` は**登録済みの型しか並べない**ので、これを使って
 *   受け取り判定をすると、まだ読み込んでいないバブリのものが黙って弾かれる。
 *   「題名さえあれば受ける」と決めた受け皿（旅程・地図）は、型を知らないまま
 *   受け取れなければならないので、荷物が名乗っている型をそのまま見る。
 * ★ 知らない型では中身は引けない（形も持ち主も分からない）。引けるのは
 *   荷物に載っている url とラベルだけ ── それで足りる所だけがこれを使う。
 */
export const anyObjectDragType = (e: React.DragEvent): DragDataType | undefined =>
  Array.from(e.dataTransfer.types).find((t) => t.startsWith("type/"));

/**
 * 登録済みの全ドラッグ型リストを取得（動的）
 */
export const getDragDataTypeList = (): DragDataType[] => {
  return [...getAllDragTypes(), BUILTIN_DRAG_TYPES.generic];
};

export const setDragPayload = (
  e: React.DragEvent,
  payload: DragPayload,
  options?: { effectAllowed?: DataTransfer["effectAllowed"] }
) => {
  const { effectAllowed = "copy" } = options ?? {};
  e.dataTransfer.effectAllowed = effectAllowed;
  e.dataTransfer.setData(payload.type, payload.url);
  e.dataTransfer.setData(DRAG_KEYS.url, payload.url);
  if (payload.label) {
    e.dataTransfer.setData(DRAG_KEYS.label, payload.label);
  }
  if (payload.objectId) {
    e.dataTransfer.setData(DRAG_KEYS.objectId, payload.objectId);
  }
  if (payload.sourceBubbleId) {
    e.dataTransfer.setData(DRAG_KEYS.sourceBubbleId, payload.sourceBubbleId);
  }
};

/**
 * この荷物を受け取れる型かどうかだけを見る（中身は読まない）。
 *
 * dragover の時点では、ブラウザは `dataTransfer.getData()` に空文字しか返さない
 * （保護モード。中身が読めるのは drop のときだけ）。なので dragover の判定に
 * `parseDragPayload` を使うと必ず null になり、`preventDefault()` されず、
 * 結果として drop が一度も発火しない。dragover では types だけを見ること。
 */
export const hasDragPayload = (
  e: React.DragEvent,
  options?: { acceptTypes?: DragDataType[] }
): boolean => {
  const { acceptTypes } = options ?? {};
  const types = Array.from(e.dataTransfer.types);
  const targetTypes = acceptTypes && acceptTypes.length > 0 ? acceptTypes : getDragDataTypeList();
  return targetTypes.some((t) => types.includes(t));
};

export const parseDragPayload = (
  e: React.DragEvent,
  options?: { acceptTypes?: DragDataType[] }
): DragPayload | null => {
  const { acceptTypes } = options ?? {};
  const types = Array.from(e.dataTransfer.types);
  const targetTypes = acceptTypes && acceptTypes.length > 0 ? acceptTypes : getDragDataTypeList();
  const hitType = targetTypes.find((t) => types.includes(t));
  if (!hitType) return null;

  const url = e.dataTransfer.getData(hitType);
  if (!url) return null;

  const label = e.dataTransfer.getData(DRAG_KEYS.label) || undefined;
  const objectId = e.dataTransfer.getData(DRAG_KEYS.objectId) || undefined;
  const sourceBubbleId = e.dataTransfer.getData(DRAG_KEYS.sourceBubbleId) || undefined;

  return { type: hitType, url, label, objectId, sourceBubbleId };
};

export const useDragPayload = (
  payload: DragPayload | null,
  options?: { effectAllowed?: DataTransfer["effectAllowed"] }
) => {
  const onDragStart = React.useCallback(
    (e: React.DragEvent) => {
      if (!payload) return;
      setDragPayload(e, payload, options);
    },
    [payload, options]
  );

  return { draggable: !!payload, onDragStart };
};

export const useDropPayload = (
  onDropPayload: (payload: DragPayload, event: React.DragEvent) => void,
  options?: { acceptTypes?: DragDataType[]; dropEffect?: DataTransfer["dropEffect"] }
) => {
  const { acceptTypes, dropEffect = "copy" } = options ?? {};

  const handleDragOver = React.useCallback(
    (e: React.DragEvent) => {
      // dragover では中身が読めないので型だけ見る（hasDragPayload のコメント参照）
      if (!hasDragPayload(e, { acceptTypes })) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = dropEffect;
    },
    [acceptTypes, dropEffect]
  );

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      const payload = parseDragPayload(e, { acceptTypes });
      if (!payload) return;
      e.preventDefault();
      e.stopPropagation();
      onDropPayload(payload, e);
    },
    [acceptTypes, onDropPayload]
  );

  return { onDragOver: handleDragOver, onDrop: handleDrop };
};
