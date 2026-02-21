import { TurnBase } from "./Turn.js";

/**
 * 通常メッセージのターン状態
 */
export type MessageTurnState = {
  readonly id: string;
  readonly speakerId: string;
  readonly kind: "MessageTurn";
  readonly message: string;
};

/**
 * 通常メッセージのターン
 */
export class MessageTurn implements TurnBase {
  readonly kind = "MessageTurn" as const;

  constructor(readonly state: MessageTurnState) {}

  get id(): string {
    return this.state.id;
  }

  get speakerId(): string {
    return this.state.speakerId;
  }

  get message(): string {
    return this.state.message;
  }

  /**
   * メッセージを更新した新しいターンを返す
   */
  updateMessage(message: string): MessageTurn {
    return new MessageTurn({ ...this.state, message });
  }
}
