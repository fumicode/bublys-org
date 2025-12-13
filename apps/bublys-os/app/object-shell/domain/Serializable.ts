/**
 * Serializable Interface
 *
 * シリアライズ/デシリアライズ可能なドメインオブジェクトのインターフェース
 * ObjectShellで管理されるすべてのドメインオブジェクトはこのインターフェースを実装する必要がある
 */

export interface Serializable<T = any> {
  /**
   * オブジェクトをJSONシリアライズ可能な形式に変換
   */
  toJSON(): T;
}

export interface SerializableConstructor<T, JSON = any> {
  /**
   * JSONからオブジェクトを復元
   */
  fromJSON(json: JSON): T;
}

/**
 * 型ガード: オブジェクトがSerializableインターフェースを実装しているか確認
 */
export function isSerializable(obj: any): obj is Serializable {
  return obj && typeof obj.toJSON === 'function';
}

/**
 * 型ガード: コンストラクタがSerializableConstructorを実装しているか確認
 */
export function hasFromJSON<T>(
  constructor: any
): constructor is SerializableConstructor<T> {
  return constructor && typeof constructor.fromJSON === 'function';
}
