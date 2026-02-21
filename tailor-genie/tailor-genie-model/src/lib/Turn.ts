import { MessageTurn } from "./MessageTurn.js";
import { QuestionTurn } from "./QuestionTurn.js";
import { AnswerTurn } from "./AnswerTurn.js";

/**
 * すべてのターンが持つ共通インターフェイス
 */
export interface TurnBase {
  readonly kind: string;
  readonly id: string;
  readonly speakerId: string;
}

/**
 * ターン（会話の1発言）のUnion型
 */
export type Turn = MessageTurn | QuestionTurn | AnswerTurn;

/**
 * ターンの種類
 */
export type TurnKind = Turn["kind"];
