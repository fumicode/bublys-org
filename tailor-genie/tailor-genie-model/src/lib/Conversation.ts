import { uuid } from "@bublys-org/bubbles-ui-util";
import { Speaker } from "./Speaker.js";
import { Turn } from "./Turn.js";
import { Choice } from "./Choice.js";
import { MessageTurn, MessageTurnState } from "./MessageTurn.js";
import { QuestionTurn, QuestionTurnState } from "./QuestionTurn.js";
import { AnswerTurn, AnswerTurnState } from "./AnswerTurn.js";

/**
 * ターン状態（Union型）
 */
export type TurnState = MessageTurnState | QuestionTurnState | AnswerTurnState;

/**
 * TurnStateから適切なTurnクラスを生成するファクトリ関数
 */
export function createTurn(state: TurnState): Turn {
  switch (state.kind) {
    case "MessageTurn":
      return new MessageTurn(state);
    case "QuestionTurn":
      return new QuestionTurn(state);
    case "AnswerTurn":
      return new AnswerTurn(state);
  }
}

/**
 * シリアライズ済みの会話状態（JSONセーフ）
 */
export type SerializedConversationState = {
  readonly id: string;
  readonly participantIds: string[];
  readonly turns: TurnState[];
};

/**
 * 会話の状態
 */
export type ConversationState = {
  readonly id: string;
  readonly participantIds: string[];
  readonly turns: Turn[];
};

/**
 * 会話（集約ルート）
 */
export class Conversation {
  constructor(readonly state: ConversationState) {}

  get id(): string {
    return this.state.id;
  }

  get participantIds(): string[] {
    return this.state.participantIds;
  }

  get turns(): Turn[] {
    return this.state.turns;
  }

  /**
   * 未回答の質問を取得
   * 最後の質問ターンで、まだ回答がないものを返す
   */
  get pendingQuestion(): QuestionTurn | undefined {
    // 後ろから質問を探す
    for (let i = this.state.turns.length - 1; i >= 0; i--) {
      const turn = this.state.turns[i];
      if (turn.kind === "QuestionTurn") {
        // この質問に対する回答があるかチェック
        const hasAnswer = this.state.turns.some(
          (t) => t.kind === "AnswerTurn" && t.questionTurnId === turn.id
        );
        if (!hasAnswer) {
          return turn;
        }
        // 回答済みの質問が見つかったら、それより前は探さない
        return undefined;
      }
    }
    return undefined;
  }

  /**
   * ゲストが発言可能な選択肢を取得
   * 未回答の質問がある場合はその選択肢、なければundefined（自由発言可能）
   */
  get availableChoicesForGuest(): Choice[] | undefined {
    const pending = this.pendingQuestion;
    if (!pending) {
      return undefined; // 自由発言可能
    }
    return pending.choices;
  }

  addParticipant(speakerId: string): Conversation {
    if (this.state.participantIds.includes(speakerId)) {
      return this;
    }
    return new Conversation({
      ...this.state,
      participantIds: [...this.state.participantIds, speakerId],
    });
  }

  removeParticipant(speakerId: string): Conversation {
    return new Conversation({
      ...this.state,
      participantIds: this.state.participantIds.filter((id) => id !== speakerId),
    });
  }

  hasParticipant(speakerId: string): boolean {
    return this.state.participantIds.includes(speakerId);
  }

  /**
   * 通常のメッセージを発言
   * ゲストは未回答の質問がある場合は発言できない
   */
  speak(speaker: Speaker, message: string): Conversation {
    // ゲストで未回答の質問がある場合はエラー
    if (speaker.isGuest && this.pendingQuestion) {
      throw new Error("質問に回答してください");
    }

    const turn = new MessageTurn({
      id: uuid(),
      speakerId: speaker.id,
      kind: "MessageTurn",
      message,
    });
    return new Conversation({
      ...this.state,
      turns: [...this.state.turns, turn],
    });
  }

  /**
   * ホストが質問を投げる
   * ホストのみ使用可能
   */
  askQuestion(host: Speaker, question: string, choices: Choice[]): Conversation {
    if (!host.isHost) {
      throw new Error("ホストのみ質問できます");
    }

    if (choices.length < 2) {
      throw new Error("選択肢は2つ以上必要です");
    }

    // 未回答の質問がある場合はエラー
    if (this.pendingQuestion) {
      throw new Error("前の質問に回答されるまで新しい質問はできません");
    }

    const turn = new QuestionTurn({
      id: uuid(),
      speakerId: host.id,
      kind: "QuestionTurn",
      question,
      choices,
    });
    return new Conversation({
      ...this.state,
      turns: [...this.state.turns, turn],
    });
  }

  /**
   * ゲストが質問に回答
   * ゲストのみ使用可能
   */
  answerQuestion(guest: Speaker, choiceId: string): Conversation {
    if (!guest.isGuest) {
      throw new Error("ゲストのみ回答できます");
    }

    const pending = this.pendingQuestion;
    if (!pending) {
      throw new Error("回答する質問がありません");
    }

    // 選択肢が有効かチェック
    if (!pending.hasChoice(choiceId)) {
      throw new Error("無効な選択肢です");
    }

    const turn = new AnswerTurn({
      id: uuid(),
      speakerId: guest.id,
      kind: "AnswerTurn",
      questionTurnId: pending.id,
      choiceId,
    });
    return new Conversation({
      ...this.state,
      turns: [...this.state.turns, turn],
    });
  }

  /**
   * 質問に対する回答を取得
   */
  getAnswerForQuestion(questionTurnId: string): AnswerTurn | undefined {
    return this.state.turns.find(
      (t): t is AnswerTurn =>
        t.kind === "AnswerTurn" && t.questionTurnId === questionTurnId
    );
  }

  /**
   * 選択肢のテキストを取得
   */
  getChoiceText(questionTurnId: string, choiceId: string): string | undefined {
    const turn = this.state.turns.find((t) => t.id === questionTurnId);
    if (turn?.kind !== "QuestionTurn") {
      return undefined;
    }
    return turn.getChoice(choiceId)?.text;
  }

  toJSON(): SerializedConversationState {
    return {
      id: this.state.id,
      participantIds: this.state.participantIds,
      turns: this.state.turns.map((t) => t.state as TurnState),
    };
  }

  static fromJSON(json: SerializedConversationState): Conversation {
    return new Conversation({
      id: json.id,
      participantIds: json.participantIds,
      turns: json.turns.map(createTurn),
    });
  }
}
