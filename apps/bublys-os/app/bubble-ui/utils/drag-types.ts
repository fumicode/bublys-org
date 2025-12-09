export const DRAG_DATA_TYPES = {
  user: "type/user",
  users: "type/users",
  userGroup: "type/user-group",
  userGroups: "type/user-groups",
  memo: "type/memo",
  memos: "type/memos",
  generic: "type/generic",
} as const;

export type DragDataType = (typeof DRAG_DATA_TYPES)[keyof typeof DRAG_DATA_TYPES];

export const DRAG_DATA_TYPE_LIST: DragDataType[] = [
  DRAG_DATA_TYPES.user,
  DRAG_DATA_TYPES.users,
  DRAG_DATA_TYPES.userGroup,
  DRAG_DATA_TYPES.userGroups,
  DRAG_DATA_TYPES.memo,
  DRAG_DATA_TYPES.memos,
];
