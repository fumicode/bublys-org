// Speaker
export { Speaker } from "./lib/Speaker.js";
export type { SpeakerState, SpeakerRole } from "./lib/Speaker.js";

// Turn (union type and interface)
export type { Turn, TurnBase, TurnKind } from "./lib/Turn.js";

// Turn classes
export { MessageTurn } from "./lib/MessageTurn.js";
export type { MessageTurnState } from "./lib/MessageTurn.js";

export { QuestionTurn } from "./lib/QuestionTurn.js";
export type { QuestionTurnState } from "./lib/QuestionTurn.js";

export { AnswerTurn } from "./lib/AnswerTurn.js";
export type { AnswerTurnState } from "./lib/AnswerTurn.js";

// Choice
export type { Choice } from "./lib/Choice.js";

// Conversation
export { Conversation, createTurn } from "./lib/Conversation.js";
export type { ConversationState, SerializedConversationState, TurnState } from "./lib/Conversation.js";
