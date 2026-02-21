import { Conversation } from "./Conversation.js";
import { Speaker } from "./Speaker.js";
import { Choice } from "./Choice.js";
import { QuestionTurn } from "./QuestionTurn.js";

describe("Conversation", () => {
  const host = new Speaker({ id: "host-1", name: "ジーニー", role: "host" });
  const guest = new Speaker({ id: "guest-1", name: "坂口様", role: "guest" });

  const createEmptyConversation = () =>
    new Conversation({
      id: "conv-1",
      participantIds: [host.id, guest.id],
      turns: [],
    });

  describe("speak", () => {
    it("ホストは通常メッセージを発言できる", () => {
      const conversation = createEmptyConversation();
      const updated = conversation.speak(host, "こんにちは");

      expect(updated.turns).toHaveLength(1);
      const turn = updated.turns[0];
      expect(turn.kind).toBe("MessageTurn");
      expect(turn.kind).toBe("MessageTurn");
      if (turn.kind === "MessageTurn") {
        expect(turn.message).toBe("こんにちは");
      }
      expect(turn.speakerId).toBe(host.id);
    });

    it("ゲストは未回答の質問がなければ通常メッセージを発言できる", () => {
      const conversation = createEmptyConversation();
      const updated = conversation.speak(guest, "よろしくお願いします");

      expect(updated.turns).toHaveLength(1);
      const turn = updated.turns[0];
      expect(turn.kind).toBe("MessageTurn");
      if (turn.kind === "MessageTurn") {
        expect(turn.message).toBe("よろしくお願いします");
      }
    });

    it("ゲストは未回答の質問があると通常メッセージを発言できない", () => {
      const conversation = createEmptyConversation();
      const choices: Choice[] = [
        { id: "c1", text: "ネイビー" },
        { id: "c2", text: "グレー" },
      ];
      const withQuestion = conversation.askQuestion(host, "お好みの色は？", choices);

      expect(() => withQuestion.speak(guest, "ネイビーがいいです")).toThrow(
        "質問に回答してください"
      );
    });
  });

  describe("askQuestion", () => {
    it("ホストは選択肢付きの質問を投げられる", () => {
      const conversation = createEmptyConversation();
      const choices: Choice[] = [
        { id: "c1", text: "ネイビー" },
        { id: "c2", text: "グレー" },
        { id: "c3", text: "ブラック" },
      ];
      const updated = conversation.askQuestion(host, "お好みの色は？", choices);

      expect(updated.turns).toHaveLength(1);
      const turn = updated.turns[0];
      expect(turn.kind).toBe("QuestionTurn");
      expect(turn.kind).toBe("QuestionTurn");
      if (turn.kind === "QuestionTurn") {
        expect(turn.question).toBe("お好みの色は？");
        expect(turn.choices).toEqual(choices);
      }
    });

    it("ゲストは質問を投げられない", () => {
      const conversation = createEmptyConversation();
      const choices: Choice[] = [
        { id: "c1", text: "選択肢1" },
        { id: "c2", text: "選択肢2" },
      ];

      expect(() =>
        conversation.askQuestion(guest, "質問？", choices)
      ).toThrow("ホストのみ質問できます");
    });

    it("選択肢は2つ以上必要", () => {
      const conversation = createEmptyConversation();
      const choices: Choice[] = [{ id: "c1", text: "選択肢1" }];

      expect(() =>
        conversation.askQuestion(host, "質問？", choices)
      ).toThrow("選択肢は2つ以上必要です");
    });

    it("未回答の質問がある場合は新しい質問を投げられない", () => {
      const conversation = createEmptyConversation();
      const choices: Choice[] = [
        { id: "c1", text: "選択肢1" },
        { id: "c2", text: "選択肢2" },
      ];
      const withQuestion = conversation.askQuestion(host, "質問1？", choices);

      expect(() =>
        withQuestion.askQuestion(host, "質問2？", choices)
      ).toThrow("前の質問に回答されるまで新しい質問はできません");
    });
  });

  describe("answerQuestion", () => {
    it("ゲストは質問に回答できる", () => {
      const conversation = createEmptyConversation();
      const choices: Choice[] = [
        { id: "c1", text: "ネイビー" },
        { id: "c2", text: "グレー" },
      ];
      const withQuestion = conversation.askQuestion(host, "お好みの色は？", choices);
      const questionTurnId = withQuestion.turns[0].id;
      const answered = withQuestion.answerQuestion(guest, "c1");

      expect(answered.turns).toHaveLength(2);
      const turn = answered.turns[1];
      expect(turn.kind).toBe("AnswerTurn");
      expect(turn.kind).toBe("AnswerTurn");
      if (turn.kind === "AnswerTurn") {
        expect(turn.questionTurnId).toBe(questionTurnId);
        expect(turn.choiceId).toBe("c1");
      }
    });

    it("ホストは回答できない", () => {
      const conversation = createEmptyConversation();
      const choices: Choice[] = [
        { id: "c1", text: "選択肢1" },
        { id: "c2", text: "選択肢2" },
      ];
      const withQuestion = conversation.askQuestion(host, "質問？", choices);

      expect(() => withQuestion.answerQuestion(host, "c1")).toThrow(
        "ゲストのみ回答できます"
      );
    });

    it("未回答の質問がない場合は回答できない", () => {
      const conversation = createEmptyConversation();

      expect(() => conversation.answerQuestion(guest, "c1")).toThrow(
        "回答する質問がありません"
      );
    });

    it("無効な選択肢では回答できない", () => {
      const conversation = createEmptyConversation();
      const choices: Choice[] = [
        { id: "c1", text: "選択肢1" },
        { id: "c2", text: "選択肢2" },
      ];
      const withQuestion = conversation.askQuestion(host, "質問？", choices);

      expect(() => withQuestion.answerQuestion(guest, "c999")).toThrow(
        "無効な選択肢です"
      );
    });
  });

  describe("pendingQuestion", () => {
    it("未回答の質問がなければundefined", () => {
      const conversation = createEmptyConversation();
      expect(conversation.pendingQuestion).toBeUndefined();
    });

    it("質問があれば返す", () => {
      const conversation = createEmptyConversation();
      const choices: Choice[] = [
        { id: "c1", text: "選択肢1" },
        { id: "c2", text: "選択肢2" },
      ];
      const withQuestion = conversation.askQuestion(host, "質問？", choices);

      expect(withQuestion.pendingQuestion).toBeDefined();
      expect(withQuestion.pendingQuestion?.question).toBe("質問？");
    });

    it("回答済みならundefined", () => {
      const conversation = createEmptyConversation();
      const choices: Choice[] = [
        { id: "c1", text: "選択肢1" },
        { id: "c2", text: "選択肢2" },
      ];
      const withQuestion = conversation.askQuestion(host, "質問？", choices);
      const answered = withQuestion.answerQuestion(guest, "c1");

      expect(answered.pendingQuestion).toBeUndefined();
    });
  });

  describe("availableChoicesForGuest", () => {
    it("未回答の質問がなければundefined（自由発言可能）", () => {
      const conversation = createEmptyConversation();
      expect(conversation.availableChoicesForGuest).toBeUndefined();
    });

    it("未回答の質問があれば選択肢を返す", () => {
      const conversation = createEmptyConversation();
      const choices: Choice[] = [
        { id: "c1", text: "ネイビー" },
        { id: "c2", text: "グレー" },
      ];
      const withQuestion = conversation.askQuestion(host, "お好みの色は？", choices);

      expect(withQuestion.availableChoicesForGuest).toEqual(choices);
    });
  });

  describe("回答後の会話フロー", () => {
    it("質問→回答→通常メッセージ→次の質問の流れが可能", () => {
      let conversation = createEmptyConversation();

      // ホストが質問
      const choices1: Choice[] = [
        { id: "c1", text: "ネイビー" },
        { id: "c2", text: "グレー" },
      ];
      conversation = conversation.askQuestion(host, "お好みの色は？", choices1);
      expect(conversation.turns).toHaveLength(1);

      // ゲストが回答
      conversation = conversation.answerQuestion(guest, "c1");
      expect(conversation.turns).toHaveLength(2);
      expect(conversation.pendingQuestion).toBeUndefined();

      // ホストが通常メッセージ
      conversation = conversation.speak(host, "ネイビーですね、承知しました");
      expect(conversation.turns).toHaveLength(3);

      // ゲストも通常メッセージを言える
      conversation = conversation.speak(guest, "はい、お願いします");
      expect(conversation.turns).toHaveLength(4);

      // ホストが次の質問
      const choices2: Choice[] = [
        { id: "s1", text: "スリム" },
        { id: "s2", text: "レギュラー" },
      ];
      conversation = conversation.askQuestion(host, "シルエットは？", choices2);
      expect(conversation.turns).toHaveLength(5);
      expect(conversation.pendingQuestion).toBeDefined();
    });
  });

  describe("getChoiceText", () => {
    it("選択肢のテキストを取得できる", () => {
      const conversation = createEmptyConversation();
      const choices: Choice[] = [
        { id: "c1", text: "ネイビー" },
        { id: "c2", text: "グレー" },
      ];
      const withQuestion = conversation.askQuestion(host, "お好みの色は？", choices);
      const questionTurnId = withQuestion.turns[0].id;

      expect(withQuestion.getChoiceText(questionTurnId, "c1")).toBe("ネイビー");
      expect(withQuestion.getChoiceText(questionTurnId, "c2")).toBe("グレー");
      expect(withQuestion.getChoiceText(questionTurnId, "c999")).toBeUndefined();
    });
  });

  describe("QuestionTurn", () => {
    it("getChoiceで選択肢を取得できる", () => {
      const conversation = createEmptyConversation();
      const choices: Choice[] = [
        { id: "c1", text: "ネイビー" },
        { id: "c2", text: "グレー" },
      ];
      const withQuestion = conversation.askQuestion(host, "お好みの色は？", choices);
      const questionTurn = withQuestion.turns[0] as QuestionTurn;

      expect(questionTurn.getChoice("c1")).toEqual({ id: "c1", text: "ネイビー" });
      expect(questionTurn.getChoice("c999")).toBeUndefined();
    });

    it("hasChoiceで選択肢の存在を確認できる", () => {
      const conversation = createEmptyConversation();
      const choices: Choice[] = [
        { id: "c1", text: "ネイビー" },
        { id: "c2", text: "グレー" },
      ];
      const withQuestion = conversation.askQuestion(host, "お好みの色は？", choices);
      const questionTurn = withQuestion.turns[0] as QuestionTurn;

      expect(questionTurn.hasChoice("c1")).toBe(true);
      expect(questionTurn.hasChoice("c999")).toBe(false);
    });
  });
});
