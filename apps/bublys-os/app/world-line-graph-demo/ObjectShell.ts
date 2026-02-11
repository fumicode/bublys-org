/**
 * ObjectShell — 汎用 mutable シェル（ObjectShell プロトタイプ）
 *
 * immutable なドメインオブジェクトを mutable なコンテナで包む。
 * WorldLineGraph との接続は _bind() で注入された commitFn が担う。
 * Shell 自身は React も WorldLineGraph も知らない。
 */
export class ObjectShell<T> {
  private _object: T;
  private _commitFn: (() => void) | null = null;
  private _toJSON: (obj: T) => unknown;

  constructor(
    readonly id: string,
    object: T,
    toJSON: (obj: T) => unknown
  ) {
    this._object = object;
    this._toJSON = toJSON;
  }

  get object(): T {
    return this._object;
  }

  /** ドメインオブジェクトを更新し、自動的に commit する */
  update(fn: (obj: T) => T): void {
    this._object = fn(this._object);
    this._commitFn?.();
  }

  toJSON(): unknown {
    return this._toJSON(this._object);
  }

  /** Manager が commit 関数を注入する（Shell は中身を知らない） */
  _bind(commitFn: () => void): void {
    this._commitFn = commitFn;
  }

  /** Manager が apex 変更時にドメインオブジェクトを差し替える */
  _replaceObject(obj: T): void {
    this._object = obj;
  }
}
