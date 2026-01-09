/**
 * オブジェクト型の中央登録
 * 各オブジェクト型のURLパターンを定義する
 *
 * ドラッグ型は ObjectType のキーから自動導出される
 * 例: 'User' → 'type/user'
 */
export const ObjectTypes = {
  User: { urlPattern: 'users/:id' },
  UserGroup: { urlPattern: 'user-groups/:id' },
  Memo: { urlPattern: 'memos/:id' },
  Staff: { urlPattern: 'gakkai-shift/staffs/:id' },
  StaffAvailability: { urlPattern: 'gakkai-shift/staffs/:id/availableTimeSlots' },
  ShiftAssignment: { urlPattern: 'gakkai-shift/assignments/:id' },
  // 複数形（リスト用）- 将来的に統合検討
  Users: { urlPattern: 'users' },
  UserGroups: { urlPattern: 'user-groups' },
  Memos: { urlPattern: 'memos' },
} as const;

export type ObjectType = keyof typeof ObjectTypes;

/**
 * ObjectType から drag type 文字列を生成
 * 例: 'User' → 'type/user', 'UserGroup' → 'type/user-group'
 */
export const getDragType = (type: ObjectType): string => {
  // CamelCase を kebab-case に変換
  const kebab = type.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  return `type/${kebab}`;
};

/**
 * drag type 文字列から ObjectType を逆引き
 * 例: 'type/user' → 'User'
 */
export const getObjectType = (dragType: string): ObjectType | null => {
  for (const key of Object.keys(ObjectTypes) as ObjectType[]) {
    if (getDragType(key) === dragType) {
      return key;
    }
  }
  return null;
};

/**
 * 全ての drag type のリスト
 */
export const ALL_DRAG_TYPES = (Object.keys(ObjectTypes) as ObjectType[]).map(getDragType);
