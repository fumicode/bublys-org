import { User } from "./User.js";

/**
 * ターン（会話の1発言）
 * Conversation集約のメンバー
 */
export type TurnState = {
  readonly id: string;
  readonly userId: string;
  readonly message: string;
};

export class Turn {
  constructor(readonly state: TurnState) {}

  get id(): string {
    return this.state.id;
  }

  get userId(): string {
    return this.state.userId;
  }

  get message(): string {
    return this.state.message;
  }

  updateMessage(message: string): Turn {
    return new Turn({ ...this.state, message });
  }
}

/**
 * 会話（集約ルート）
 */
export type ConversationState = {
  readonly id: string;
  readonly turns: Turn[];
};

export class Conversation {
  constructor(readonly state: ConversationState) {}

  get id(): string {
    return this.state.id;
  }

  get turns(): Turn[] {
    return this.state.turns;
  }

  speak(user: User, message: string): Conversation {
    const turn = new Turn({
      id: crypto.randomUUID(),
      userId: user.id,
      message,
    });
    return new Conversation({
      ...this.state,
      turns: [...this.state.turns, turn],
    });
  }

  removeTurn(turnId: string): Conversation {
    return new Conversation({
      ...this.state,
      turns: this.state.turns.filter((t) => t.id !== turnId),
    });
  }

  updateTurn(turnId: string, message: string): Conversation {
    return new Conversation({
      ...this.state,
      turns: this.state.turns.map((t) =>
        t.id === turnId ? t.updateMessage(message) : t
      ),
    });
  }
}
