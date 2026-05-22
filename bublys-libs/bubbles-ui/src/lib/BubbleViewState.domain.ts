import type { BubbleViewStateJson } from "./state/bubbles-slice.js";

/**
 * バブルUIの「表示状態」(arrangement) を1つのドメインオブジェクトとして包む。
 *
 * world-line-graph の CAS は型ごとに class を要求する（plain object だと
 * instanceof 解決ができない）ため、view 状態専用のクラスを用意する。
 * 単一 view = 単一 scope なので id は固定。
 */
export class BubbleViewState {
  constructor(readonly state: BubbleViewStateJson) {}

  get bubbles() {
    return this.state.bubbles;
  }
  get bubbleRelations() {
    return this.state.bubbleRelations;
  }
  get process() {
    return this.state.process;
  }

  toJSON(): BubbleViewStateJson {
    return this.state;
  }

  static fromJSON(json: BubbleViewStateJson): BubbleViewState {
    return new BubbleViewState(json);
  }
}
