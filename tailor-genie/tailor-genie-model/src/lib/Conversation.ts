import { Speaker } from "./Speaker.js";

/**
 * ターン（会話の1発言）
 * Conversation集約のメンバー
 */
export type TurnState = {
  readonly id: string;
  readonly speakerId: string;
  readonly message: string;
};

export class Turn {
  constructor(readonly state: TurnState) {}

  get id(): string {
    return this.state.id;
  }

  get speakerId(): string {
    return this.state.speakerId;
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

  speak(speaker: Speaker, message: string): Conversation {
    const turn = new Turn({
      id: crypto.randomUUID(),
      speakerId: speaker.id,
      message,
    });
    return new Conversation({
      ...this.state,
      turns: [...this.state.turns, turn],
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
