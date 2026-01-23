import { SpellModeState, SpellModeStateData } from "../../Spell/domain/SpellModeState";

/**
 * FloatMode（バブル移動モード）の状態を管理するドメインモデル
 *
 * バブルを移動すると全バブルが泡に包まれ、
 * content無効化・バブル全域ドラッグ可能になる。
 * バブル以外をクリックまたはEscで解除。
 */

export interface FloatModeStateData extends SpellModeStateData {}

export class FloatModeState implements SpellModeState<FloatModeStateData> {
  constructor(readonly state: FloatModeStateData) {}

  static initial(): FloatModeState {
    return new FloatModeState({ isActive: false });
  }

  /** FloatModeを開始 */
  activate(): FloatModeState {
    return new FloatModeState({ isActive: true });
  }

  /** FloatModeを終了 */
  deactivate(): FloatModeState {
    return FloatModeState.initial();
  }

  get isActive(): boolean {
    return this.state.isActive;
  }
}
