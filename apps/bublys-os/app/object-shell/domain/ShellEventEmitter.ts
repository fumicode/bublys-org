/**
 * ShellEventEmitter
 * Shellの状態変更イベントを発火・購読するシンプルなイベントエミッター
 *
 * 疎結合を維持するため、Shellはこのエミッターを通じてイベントを発火し、
 * 外部のリスナー（HashWorldLineShellBridgeなど）が購読して処理する。
 */

/**
 * Shellの状態変更イベント
 */
export interface ShellChangedEvent {
  /** ShellのID（ドメインオブジェクトのIDと同じ） */
  shellId: string;
  /** 実行されたアクションの種類（countUp, countDownなど） */
  actionType: string;
  /** 更新後のドメインオブジェクト */
  domainObject: unknown;
  /** 操作を行ったユーザーID */
  userId: string;
  /** 操作の説明 */
  description: string;
  /** タイムスタンプ */
  timestamp: number;
}

/**
 * イベントハンドラーの型
 */
export type ShellChangeHandler = (event: ShellChangedEvent) => void;

/**
 * ShellEventEmitter
 * グローバルシングルトンとしてエクスポートされる
 */
class ShellEventEmitter {
  private handlers = new Set<ShellChangeHandler>();

  /**
   * イベントハンドラーを登録
   * @returns 登録解除用の関数
   */
  subscribe(handler: ShellChangeHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * イベントを発火
   * 登録されている全てのハンドラーに通知
   */
  emit(event: ShellChangedEvent): void {
    this.handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('[ShellEventEmitter] Handler error:', error);
      }
    });
  }

  /**
   * 登録されているハンドラー数を取得（デバッグ用）
   */
  get handlerCount(): number {
    return this.handlers.size;
  }
}

/**
 * グローバルシングルトンインスタンス
 */
export const shellEventEmitter = new ShellEventEmitter();
