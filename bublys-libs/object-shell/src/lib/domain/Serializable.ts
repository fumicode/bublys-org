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
  constructor: unknown
): constructor is SerializableConstructor<T> {
  return (
    constructor != null &&
    typeof (constructor as SerializableConstructor<T>).fromJSON === 'function'
  );
}

/**
 * ドメインオブジェクトをシリアライズ可能な形式に変換
 *
 * 以下の優先順位でシリアライズを試みる:
 * 1. toJSON() メソッド（標準的なSerializableインターフェース）
 * 2. toJson() メソッド（レガシー対応）
 * 3. オブジェクトをそのまま返す（プリミティブやプレーンオブジェクト）
 *
 * @param obj - シリアライズするオブジェクト
 * @returns シリアライズされたデータ
 */
export function serializeDomainObject(obj: unknown): unknown {
  if (obj == null) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  // toJSON() を優先（標準）
  if ('toJSON' in obj && typeof (obj as Serializable).toJSON === 'function') {
    return (obj as Serializable).toJSON();
  }

  // toJson() にフォールバック（レガシー）
  if ('toJson' in obj && typeof (obj as { toJson: () => unknown }).toJson === 'function') {
    return (obj as { toJson: () => unknown }).toJson();
  }

  // シリアライズメソッドがない場合はそのまま返す
  return obj;
}
