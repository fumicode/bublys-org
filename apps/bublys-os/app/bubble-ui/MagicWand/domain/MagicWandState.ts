/**
 * MagicWand（連続アクション）の状態を管理するドメインモデル
 *
 * 純粋なTypeScriptで実装され、React/Reduxに依存しない。
 * 不変データ構造として設計されている。
 */

/** アクションコールバック型 */
export type MagicWandActionCallback = (bubbleId: string) => void;

export interface MagicWandStateData {
  /** MagicWandモードがアクティブかどうか */
  isActive: boolean;
  /** 実行するアクション */
  action: MagicWandActionCallback | null;
  /** 現在ホバー中のバブルID */
  hoveredBubbleId: string | null;
  /** ホバー開始時刻（Date.now()） */
  hoverStartTime: number | null;
  /** 今回のセッションで処理済みのバブルID一覧 */
  processedBubbleIds: string[];
}

const DWELL_TIME_MS = 100;

export class MagicWandState {
  constructor(readonly state: MagicWandStateData) {}

  static initial(): MagicWandState {
    return new MagicWandState({
      isActive: false,
      action: null,
      hoveredBubbleId: null,
      hoverStartTime: null,
      processedBubbleIds: [],
    });
  }

  /** MagicWandモード開始 */
  activate(action: MagicWandActionCallback): MagicWandState {
    return new MagicWandState({
      ...this.state,
      isActive: true,
      action,
      processedBubbleIds: [],
    });
  }

  /** MagicWandモード終了 */
  deactivate(): MagicWandState {
    return MagicWandState.initial();
  }

  /** バブルヘッダーにホバー開始 */
  startHoverOnBubble(bubbleId: string): MagicWandState {
    if (!this.state.isActive) return this;
    if (this.state.hoveredBubbleId === bubbleId) return this;
    // 既に処理済みのバブルには反応しない
    if (this.state.processedBubbleIds.includes(bubbleId)) return this;

    return new MagicWandState({
      ...this.state,
      hoveredBubbleId: bubbleId,
      hoverStartTime: Date.now(),
    });
  }

  /** バブルヘッダーからホバー解除 */
  endHoverOnBubble(): MagicWandState {
    return new MagicWandState({
      ...this.state,
      hoveredBubbleId: null,
      hoverStartTime: null,
    });
  }

  /** アクション実行をマーク */
  markBubbleProcessed(bubbleId: string): MagicWandState {
    return new MagicWandState({
      ...this.state,
      hoveredBubbleId: null,
      hoverStartTime: null,
      processedBubbleIds: [...this.state.processedBubbleIds, bubbleId],
    });
  }

  /** 100ms経過でアクションを実行すべきかどうか */
  shouldExecuteAction(currentTime: number = Date.now()): boolean {
    if (!this.state.isActive) return false;
    if (!this.state.hoveredBubbleId) return false;
    if (!this.state.hoverStartTime) return false;

    return currentTime - this.state.hoverStartTime >= DWELL_TIME_MS;
  }

  get isActive(): boolean {
    return this.state.isActive;
  }

  get hoveredBubbleId(): string | null {
    return this.state.hoveredBubbleId;
  }

  get action(): MagicWandActionCallback | null {
    return this.state.action;
  }
}
