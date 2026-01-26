/**
 * オブジェクト型の動的レジストリ
 * アプリケーション側から型を登録する仕組みを提供
 *
 * DragType は ObjectType を kebab-case に変換して 'type/' 接頭辞を付けたもの
 * 例: 'User' → 'type/user', 'UserGroup' → 'type/user-group'
 * 注: HTML5 Drag and Drop API の仕様により、type は小文字に変換されるため kebab-case を使用
 */

// 登録された型名のセット
const registeredTypes: Set<string> = new Set();

/**
 * オブジェクト型を登録する
 */
export const registerObjectType = (typeName: string): void => {
  registeredTypes.add(typeName);
};

/**
 * 複数のオブジェクト型を一括登録する
 */
export const registerObjectTypes = (typeNames: string[]): void => {
  for (const typeName of typeNames) {
    registerObjectType(typeName);
  }
};

/**
 * 登録されている全てのオブジェクト型名を取得
 */
export const getRegisteredObjectTypes = (): string[] => {
  return [...registeredTypes];
};

/**
 * PascalCase を kebab-case に変換
 * 例: 'UserGroup' → 'user-group'
 */
const toKebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
};

/**
 * ObjectType から DragType を生成
 * 例: 'User' → 'type/user', 'UserGroup' → 'type/user-group'
 * 注: HTML5 Drag and Drop APIはtypeを小文字に変換するため、kebab-caseを使用
 */
export const getDragType = (typeName: string): string => {
  return `type/${toKebabCase(typeName)}`;
};

/**
 * DragType から ObjectType を取得
 * 例: 'type/User' → 'User'
 */
export const getObjectType = (dragType: string): string | null => {
  if (!dragType.startsWith('type/')) return null;
  return dragType.slice(5);
};

/**
 * 全ての登録済み DragType のリストを取得
 */
export const getAllDragTypes = (): string[] => {
  return getRegisteredObjectTypes().map(getDragType);
};

// 後方互換性のための型エイリアス
export type ObjectType = string;
