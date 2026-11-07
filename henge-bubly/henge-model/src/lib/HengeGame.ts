/**
 * 化ゲーム ドメインモデル
 *
 * 守っていること（CLAUDE.md）:
 *  - 純粋 TypeScript。React も Redux も import しない
 *  - 状態は `readonly state` 1 つ。更新は**新しいインスタンス**を返す
 *  - plain 化は `toPlain()` / `static fromPlain()` の 1 箇所だけ
 *
 * ★ **変形の履歴をここに持たない。** 履歴は世界線が持つ。
 *   バケの財布も「いまの姿」に入っているので、世界線で戻ればバケも戻る。
 */

/** ものの種類。「非」は合わせて失敗したもの */
export type PieceKind_ものの種類 =
  | "kanji" | "radical" | "chimera" | "reading" | "meaning" | "nonsense" | "word" | "nonword";

export const PIECE_KIND_LABEL: Record<PieceKind_ものの種類, string> = {
  kanji: "漢字", radical: "偏旁", chimera: "非漢字", reading: "読み",
  meaning: "意味", nonsense: "非意味", word: "熟語", nonword: "非熟語",
};

const NON_KINDS: PieceKind_ものの種類[] = ["chimera", "nonsense", "nonword"];

export type PiecePlain_もの記録 = { id: string; kind: PieceKind_ものの種類; text: string; gloss?: string };

/** 場に置かれたもの 1 つ */
export class Piece_もの {
  constructor(readonly state: { id: string; kind: PieceKind_ものの種類; text: string; gloss?: string }) {}
  get id() { return this.state.id; }
  get kind() { return this.state.kind; }
  get text() { return this.state.text; }
  get gloss() { return this.state.gloss; }
  get isNon() { return NON_KINDS.includes(this.state.kind); }
  toPlain(): PiecePlain_もの記録 { return { ...this.state }; }
  static fromPlain(p: PiecePlain_もの記録) { return new Piece_もの({ ...p }); }
}

/** 変化の方法。どれが使えるかは、選んだものの種類だけで決まる */
export type HengeMethodId_変化の方法 =
  | "decompose" | "read" | "toMeaning" | "toKanji" | "compose" | "join" | "blend" | "interpret";

export type HengeMethodDef = {
  id: HengeMethodId_変化の方法;
  label: string;
  cost: number;
  arity: 1 | 2;
  accepts: PieceKind_ものの種類[];
};

const FORM: PieceKind_ものの種類[] = ["kanji", "radical", "chimera"];

export const HENGE_METHODS: HengeMethodDef[] = [
  { id: "decompose", label: "分解する", cost: 1, arity: 1, accepts: ["kanji", "word"] },
  { id: "read", label: "読む", cost: 1, arity: 1, accepts: ["kanji", "word"] },
  { id: "toMeaning", label: "意味にする", cost: 2, arity: 1, accepts: ["kanji", "radical", "word"] },
  { id: "toKanji", label: "字にする", cost: 2, arity: 1, accepts: ["reading", "meaning"] },
  { id: "interpret", label: "解釈する", cost: 3, arity: 1, accepts: ["chimera", "nonsense", "nonword"] },
  { id: "compose", label: "組む（字面）", cost: 1, arity: 2, accepts: FORM },
  { id: "join", label: "繋ぐ（熟語）", cost: 1, arity: 2, accepts: ["kanji", "word"] },
  { id: "blend", label: "合わせる（意味）", cost: 2, arity: 2, accepts: ["meaning", "nonsense"] },
];

/** 選んだもので使える方法 */
export function methodsFor(pieces: Piece_もの[]): HengeMethodDef[] {
  return HENGE_METHODS.filter(
    (m) => m.arity === pieces.length && pieces.every((p) => m.accepts.includes(p.kind)),
  );
}

/** 変化の結果（id なし）。AI が返したものを、ここでルールに沿って整える */
export type PieceSeed_ものの種 = { kind: PieceKind_ものの種類; text: string; gloss?: string };

const ONE_HAN = /^\p{Script=Han}$/u;
const ALL_HAN = /^\p{Script=Han}{2,}$/u;

/**
 * ルール B: 漢字か非漢字かは AI ではなく Unicode が決める。
 * 字面の種は 1 文字の漢字なら漢字、そうでなければ非漢字。熟語の種も同じく漢字の並びか見る。
 */
export function normalizeSeed(seed: PieceSeed_ものの種): PieceSeed_ものの種 {
  if (seed.kind === "kanji" && !ONE_HAN.test(seed.text)) return { ...seed, kind: ALL_HAN.test(seed.text) ? "word" : "chimera" };
  if (seed.kind === "word" && !ALL_HAN.test(seed.text)) return { ...seed, kind: ONE_HAN.test(seed.text) ? "kanji" : "nonword" };
  return seed;
}

/** 最初の盤面。化 から 金 へ */
export const DEFAULT_PUZZLE: { start: string; goal: string; wallet: number; items: PieceSeed_ものの種[] } = {
  start: "化",
  goal: "金",
  wallet: 10,
  items: [
    { kind: "kanji", text: "革" },
    { kind: "kanji", text: "口" },
    { kind: "meaning", text: "🐚", gloss: "貝" },
    { kind: "meaning", text: "🧑", gloss: "人" },
    { kind: "meaning", text: "💬", gloss: "言葉" },
    { kind: "meaning", text: "🌿", gloss: "草" },
  ],
};

/** 非のもの 1 つにつき減らす点 */
export const NON_PENALTY = 2;

export type HengeGameState_化ゲーム状態 = {
  id: string;
  /** 盤面が決まる前は空 */
  start: string;
  goal: string;
  wallet: number;
  field: Piece_もの[];
};

export type HengeGamePlain_化ゲーム記録 = {
  id: string;
  start: string;
  goal: string;
  wallet: number;
  field: PiecePlain_もの記録[];
};

export class HengeGame_化ゲーム {
  constructor(readonly state: HengeGameState_化ゲーム状態) {}

  /** まっさらなゲームを 1 つ作る（盤面はまだ） */
  static create(id: string): HengeGame_化ゲーム {
    return new HengeGame_化ゲーム({ id, start: "", goal: "", wallet: 0, field: [] });
  }

  get id() { return this.state.id; }
  get wallet() { return this.state.wallet; }
  get field() { return this.state.field; }
  get isSetUp() { return this.state.goal.length > 0; }
  /** 場にゴールの漢字が現れたらクリア */
  get isCleared() { return this.isSetUp && this.state.field.some((p) => p.kind === "kanji" && p.text === this.state.goal); }
  get isOver() { return this.isSetUp && !this.isCleared && this.state.wallet <= 0; }
  get penalty() { return this.state.field.filter((p) => p.isNon).length * NON_PENALTY; }
  get score() { return this.state.wallet - this.penalty; }

  /** 盤面を置く */
  setUp(
    puzzle: { start: string; goal: string; wallet: number; items: PieceSeed_ものの種[] },
    newId: () => string,
  ): HengeGame_化ゲーム {
    const seeds = [{ kind: "kanji" as const, text: puzzle.start }, ...puzzle.items];
    return new HengeGame_化ゲーム({
      ...this.state,
      start: puzzle.start,
      goal: puzzle.goal,
      wallet: puzzle.wallet,
      field: seeds.map((s) => new Piece_もの({ id: newId(), ...normalizeSeed(s) })),
    });
  }

  canPerform(method: HengeMethodDef, inputIds: string[]): boolean {
    if (!this.isSetUp || this.isCleared || this.isOver) return false;
    if (method.cost > this.state.wallet) return false;
    const pieces = inputIds.map((id) => this.state.field.find((p) => p.id === id));
    return pieces.every(Boolean) && methodsFor(pieces as Piece_もの[]).some((m) => m.id === method.id);
  }

  /** 変化させる: 入力は消え、結果が同じ場所に生まれ、バケが減る */
  apply(
    method: HengeMethodDef,
    inputIds: string[],
    outputs: PieceSeed_ものの種[],
    newId: () => string,
  ): HengeGame_化ゲーム {
    if (!this.canPerform(method, inputIds)) return this;
    const at = this.state.field.findIndex((p) => inputIds.includes(p.id));
    const rest = this.state.field.filter((p) => !inputIds.includes(p.id));
    const born = outputs.map((s) => new Piece_もの({ id: newId(), ...normalizeSeed(s) }));
    const field = [...rest.slice(0, at), ...born, ...rest.slice(at)];
    return new HengeGame_化ゲーム({ ...this.state, field, wallet: this.state.wallet - method.cost });
  }

  toPlain(): HengeGamePlain_化ゲーム記録 {
    return { ...this.state, field: this.state.field.map((p) => p.toPlain()) };
  }

  static fromPlain(plain: HengeGamePlain_化ゲーム記録): HengeGame_化ゲーム {
    return new HengeGame_化ゲーム({
      id: plain.id,
      start: plain.start ?? "",
      goal: plain.goal ?? "",
      wallet: plain.wallet ?? 0,
      field: (plain.field ?? []).map(Piece_もの.fromPlain),
    });
  }
}
