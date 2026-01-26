import React from "react";
import { getAllDragTypes } from "../object-view/ObjectTypeRegistry.js";

/**
 * ドラッグ＆ドロップ用のユーティリティ
 * 具体的な型は ObjectTypeRegistry に登録され、ここでは汎用的な仕組みを提供
 */

export const DRAG_KEYS = {
  url: "url",
  label: "label",
} as const;

// 特殊な組み込みドラッグ型
export const BUILTIN_DRAG_TYPES = {
  generic: "type/generic",
} as const;

export type DragDataType = string;
export type DragPayload = { type: DragDataType; url: string; label?: string };

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

  return { type: hitType, url, label };
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
      const payload = parseDragPayload(e, { acceptTypes });
      if (!payload) return;
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
