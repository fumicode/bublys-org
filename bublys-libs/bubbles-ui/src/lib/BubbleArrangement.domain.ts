import type { BubbleArrangementState } from "./state/bubbles-slice.js";

/**
 * 1つの universe の中で「どのバブルがどこに開いていて、どう繋がっていて、
 * どのレイヤーに居るか」をひとまとめに表すドメインオブジェクト。
 *
 * 内訳:
 *  - bubbles          : 配置されている各バブルの json（位置・サイズ・url など）
 *  - bubbleRelations  : opener⇄openee の親子関係
 *  - process.layers   : 奥行きレイヤーごとのバブル ID 配列
 *
 * これを世界線(WorldLineGraph)に commit すれば、ある時刻の universe の
 * 「配置」をスナップショットとして残せる。逆向きに rehydrate すると
 * Redux 側の universe state がその配置に戻る。
 *
 * world-line-graph の CAS は型ごとに class を要求する（plain object だと
 * instanceof 解決ができない）ため専用クラスにしている。
 * 単一 universe = 単一 arrangement なので id は固定。
 */
export class BubbleArrangement {
  constructor(readonly state: BubbleArrangementState) {}

  get bubbles() {
    return this.state.bubbles;
  }
  get bubbleRelations() {
    return this.state.bubbleRelations;
  }
  get process() {
    return this.state.process;
  }

  toJSON(): BubbleArrangementState {
    return this.state;
  }

  static fromJSON(json: BubbleArrangementState): BubbleArrangement {
    return new BubbleArrangement(json);
  }
}
