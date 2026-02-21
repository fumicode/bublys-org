import { TurnBase } from "./Turn.js";

/**
 * 回答ターンの状態
 */
export type AnswerTurnState = {
  readonly id: string;
  readonly speakerId: string;
  readonly kind: "AnswerTurn";
  readonly questionTurnId: string;
  readonly choiceId: string;
};

/**
 * ゲストからの回答ターン
 */
export class AnswerTurn implements TurnBase {
  readonly kind = "AnswerTurn" as const;

  constructor(readonly state: AnswerTurnState) {}

  get id(): string {
    return this.state.id;
  }

  get speakerId(): string {
    return this.state.speakerId;
  }

  get questionTurnId(): string {
    return this.state.questionTurnId;
  }

  get choiceId(): string {
    return this.state.choiceId;
  }
}
