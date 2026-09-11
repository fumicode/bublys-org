/**
 * ドメイン型名 → SchemaShape のグローバルレジストリ。
 *
 * 各バブリが自分のドメイン型について `registerSchema(typeName, shape)` を呼ぶことで、
 * 他のバブリ（例: object-transformer）から `getSchema(typeName)` で shape を引ける。
 *
 * ドロップされたペイロードから型名を得て、そのままここに問い合わせる想定。
 */

import type { SchemaShape } from "./SchemaShape.js";

const registered: Map<string, SchemaShape> = new Map();

/**
 * PascalCase / camelCase を kebab-case に正規化する。
 * ObjectTypeRegistry の drag type と同じ規約なので、"Staff" と "staff" のどちらで
 * register/get しても同じスキーマを引ける。
 */
const toKebab = (s: string): string =>
  s.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

/** 型のスキーマを登録する（副作用）。同名の再登録は上書き。キーは kebab-case に正規化される */
export function registerSchema(typeName: string, shape: SchemaShape): void {
  registered.set(toKebab(typeName), shape);
}

/** 型のスキーマを取得する。PascalCase / kebab-case どちらでも引ける。未登録なら undefined */
export function getSchema(typeName: string): SchemaShape | undefined {
  return registered.get(toKebab(typeName));
}

/** 登録済みの全型名（kebab-case） */
export function getRegisteredSchemaTypes(): string[] {
  return [...registered.keys()];
}
