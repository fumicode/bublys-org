/**
 * 魔法モードの共通インターフェース
 *
 * 魔法の杖にこびりつく各種呪文（削除、移動など）が実装すべき
 * 基本的な状態管理のインターフェース。
 */

export interface SpellModeStateData {
  /** モードがアクティブかどうか */
  isActive: boolean;
}

/**
 * 魔法モード状態の共通インターフェース
 * 各呪文のStateクラスはこのインターフェースを実装する
 */
export interface SpellModeState<T extends SpellModeStateData> {
  readonly state: T;
  readonly isActive: boolean;
  deactivate(): SpellModeState<T>;
}

/**
 * 呪文の種類を識別するための型
 */
export type SpellType = "delete" | "move";

/**
 * 呪文のメタデータ
 */
export interface SpellMeta {
  type: SpellType;
  displayName: string;
}
