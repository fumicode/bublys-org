/**
 * オブジェクト型の動的レジストリ
 * アプリケーション側から型を登録する仕組みを提供
 *
 * DragType は ObjectType を kebab-case に変換して 'type/' 接頭辞を付けたもの
 * 例: 'User' → 'type/user', 'UserGroup' → 'type/user-group'
 * 注: HTML5 Drag and Drop API の仕様により、type は小文字に変換されるため kebab-case を使用
 */

import type { ReactNode } from 'react';

// 登録された型名のセット
const registeredTypes: Set<string> = new Set();

// 型名（kebab-case）に対応するアイコンのマップ
const registeredIcons: Map<string, ReactNode> = new Map();

// 型名（kebab-case）に対応するラベル解決関数のマップ
export type LabelResolver = (id: string) => string | undefined;
const registeredLabelResolvers: Map<string, LabelResolver> = new Map();

/**
 * PascalCase を kebab-case に変換
 * 例: 'UserGroup' → 'user-group'
 */
const toKebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
};

export type ObjectTypeOptions = {
  icon?: ReactNode;
  labelResolver?: LabelResolver;
};

/**
 * オブジェクト型を登録する
 */
export const registerObjectType = (typeName: string, iconOrOptions?: ReactNode | ObjectTypeOptions): void => {
  registeredTypes.add(typeName);
  const kebab = toKebabCase(typeName);
  if (iconOrOptions !== undefined && iconOrOptions !== null) {
    // ObjectTypeOptions か ReactNode（アイコン）かを判定
    if (typeof iconOrOptions === 'object' && ('icon' in iconOrOptions || 'labelResolver' in iconOrOptions)) {
      const opts = iconOrOptions as ObjectTypeOptions;
      if (opts.icon !== undefined) {
        registeredIcons.set(kebab, opts.icon);
      }
      if (opts.labelResolver !== undefined) {
        registeredLabelResolvers.set(kebab, opts.labelResolver);
      }
    } else {
      registeredIcons.set(kebab, iconOrOptions as ReactNode);
    }
  }
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
 * ObjectType から DragType を生成
 * 例: 'User' → 'type/user', 'UserGroup' → 'type/user-group'
 * 注: HTML5 Drag and Drop APIはtypeを小文字に変換するため、kebab-caseを使用
 */
export const getDragType = (typeName: string): string => {
  return `type/${toKebabCase(typeName)}`;
};

/**
 * DragType から ObjectType（kebab-case）を取得
 * 例: 'type/user' → 'user'
 */
export const getObjectType = (dragType: string): string | null => {
  if (!dragType.startsWith('type/')) return null;
  return dragType.slice(5);
};

/**
 * ObjectType（kebab-case）に対応するアイコンを取得
 */
export const getObjectTypeIcon = (objectType: string): ReactNode | null => {
  return registeredIcons.get(objectType) ?? null;
};

/**
 * ObjectType（kebab-case）に対応するラベル解決関数でラベルを取得
 */
export const resolveObjectTypeLabel = (objectType: string, id: string): string | undefined => {
  const resolver = registeredLabelResolvers.get(objectType);
  return resolver?.(id);
};

/**
 * 全ての登録済み DragType のリストを取得
 */
export const getAllDragTypes = (): string[] => {
  return getRegisteredObjectTypes().map(getDragType);
};

// 後方互換性のための型エイリアス
export type ObjectType = string;
