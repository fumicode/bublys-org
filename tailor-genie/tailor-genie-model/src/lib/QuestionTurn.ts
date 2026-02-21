import { TurnBase } from "./Turn.js";
import { Choice } from "./Choice.js";

/**
 * 質問ターンの状態
 */
export type QuestionTurnState = {
  readonly id: string;
  readonly speakerId: string;
  readonly kind: "QuestionTurn";
  readonly question: string;
  readonly choices: Choice[];
};

/**
 * ホストからの選択肢付き質問ターン
 */
export class QuestionTurn implements TurnBase {
  readonly kind = "QuestionTurn" as const;

  constructor(readonly state: QuestionTurnState) {}

  get id(): string {
    return this.state.id;
  }

  get speakerId(): string {
    return this.state.speakerId;
  }

  get question(): string {
    return this.state.question;
  }

  get choices(): Choice[] {
    return this.state.choices;
  }

  /**
   * 指定されたIDの選択肢を取得
   */
  getChoice(choiceId: string): Choice | undefined {
    return this.state.choices.find((c) => c.id === choiceId);
  }

  /**
   * 選択肢が有効かどうか
   */
  hasChoice(choiceId: string): boolean {
    return this.state.choices.some((c) => c.id === choiceId);
  }
}
