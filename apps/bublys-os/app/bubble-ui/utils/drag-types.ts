import React from "react";

export const DRAG_DATA_TYPES = {
  user: "type/user",
  users: "type/users",
  userGroup: "type/user-group",
  userGroups: "type/user-groups",
  memo: "type/memo",
  memos: "type/memos",
  staff: "type/staff",
  shiftAssignment: "type/shift-assignment",
  generic: "type/generic",
} as const;

export const DRAG_KEYS = {
  url: "url",
  label: "label",
} as const;

export type DragDataType = (typeof DRAG_DATA_TYPES)[keyof typeof DRAG_DATA_TYPES];
export type DragPayload = { type: DragDataType; url: string; label?: string };

export const DRAG_DATA_TYPE_LIST: DragDataType[] = [
  DRAG_DATA_TYPES.user,
  DRAG_DATA_TYPES.users,
  DRAG_DATA_TYPES.userGroup,
  DRAG_DATA_TYPES.userGroups,
  DRAG_DATA_TYPES.memo,
  DRAG_DATA_TYPES.memos,
  DRAG_DATA_TYPES.staff,
  DRAG_DATA_TYPES.shiftAssignment,
];

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
  const targetTypes = acceptTypes && acceptTypes.length > 0 ? acceptTypes : DRAG_DATA_TYPE_LIST;
  const hitType = targetTypes.find((t) => types.includes(t));
  if (!hitType) return null;

  let url = e.dataTransfer.getData(hitType);
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
