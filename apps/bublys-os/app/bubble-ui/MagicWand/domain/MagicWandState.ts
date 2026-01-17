/**
 * MagicWand（連続アクション）の状態を管理するドメインモデル
 *
 * 純粋なTypeScriptで実装され、React/Reduxに依存しない。
 * 不変データ構造として設計されている。
 */

export interface MagicWandStateData {
  /** MagicWandモードがアクティブかどうか */
  isActive: boolean;
  /** カーソルの現在位置（炎エフェクトの表示位置） */
  cursorPosition: { x: number; y: number } | null;
  /** 現在ホバー中のバブルID */
  hoveredBubbleId: string | null;
  /** ホバー開始時刻（Date.now()） */
  hoverStartTime: number | null;
  /** 今回のセッションで削除したバブルID一覧 */
  deletedBubbleIds: string[];
}

const DWELL_TIME_MS = 100;

export class MagicWandState {
  constructor(readonly state: MagicWandStateData) {}

  static initial(): MagicWandState {
    return new MagicWandState({
      isActive: false,
      cursorPosition: null,
      hoveredBubbleId: null,
      hoverStartTime: null,
      deletedBubbleIds: [],
    });
  }

  /** MagicWandモード開始 */
  activate(cursorPosition: { x: number; y: number }): MagicWandState {
    return new MagicWandState({
      ...this.state,
      isActive: true,
      cursorPosition,
      deletedBubbleIds: [],
    });
  }

  /** MagicWandモード終了 */
  deactivate(): MagicWandState {
    return MagicWandState.initial();
  }

  /** カーソル位置更新 */
  updateCursorPosition(position: { x: number; y: number }): MagicWandState {
    if (!this.state.isActive) return this;
    return new MagicWandState({
      ...this.state,
      cursorPosition: position,
    });
  }

  /** バブルヘッダーにホバー開始 */
  startHoverOnBubble(bubbleId: string): MagicWandState {
    if (!this.state.isActive) return this;
    if (this.state.hoveredBubbleId === bubbleId) return this;
    // 既に削除済みのバブルには反応しない
    if (this.state.deletedBubbleIds.includes(bubbleId)) return this;

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

  /** 削除実行をマーク */
  markBubbleDeleted(bubbleId: string): MagicWandState {
    return new MagicWandState({
      ...this.state,
      hoveredBubbleId: null,
      hoverStartTime: null,
      deletedBubbleIds: [...this.state.deletedBubbleIds, bubbleId],
    });
  }

  /** 100ms経過で削除すべきかどうか */
  shouldDeleteHoveredBubble(currentTime: number = Date.now()): boolean {
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

  get cursorPosition(): { x: number; y: number } | null {
    return this.state.cursorPosition;
  }
}
