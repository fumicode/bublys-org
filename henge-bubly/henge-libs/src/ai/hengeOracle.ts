/**
 * **変化の問い合わせ口（AI 版）。**
 *
 * AI が返すのは結果の「種」だけ。漢字か非漢字かの最終判断はドメインの
 * `normalizeSeed`（Unicode）がする。
 */
import type {
  HengeMethodId_変化の方法,
  Piece_もの,
  PieceSeed_ものの種,
} from "@bublys-org/henge-model";
import { askAIForJson } from "./askAI.js";

const ROLE =
  "あなたは漢字の錬金術ゲーム「化け▶ばけ▶バケツ」の変化係。必ず JSON だけを返す。" +
  "読みは音読みならカタカナ、訓読みならひらがな。意味は絵文字 1〜2 個(emoji)と短い日本語(gloss)で表す。";

const describe = (p: Piece_もの) => `${p.kind}「${p.text}」${p.gloss ? `(${p.gloss})` : ""}`;

type Out = { outputs: PieceSeed_ものの種[] };

const PROMPTS: Record<HengeMethodId_変化の方法, (ps: Piece_もの[]) => string> = {
  decompose: ([p]) =>
    `「${p.text}」を構成要素(偏旁や部品の漢字)に分解して。熟語なら1字ずつに。` +
    `{"outputs":[{"kind":"radical"か"kanji","text":"1文字"}]}。単独で漢字として使える部品は kanji。`,
  read: ([p]) =>
    `「${p.text}」の代表的な読みを最大2つ(音1つ・訓1つ)。{"outputs":[{"kind":"reading","text":"カナ"}]}`,
  toMeaning: ([p]) =>
    `「${p.text}」の意味を絵文字で。{"outputs":[{"kind":"meaning","text":"絵文字","gloss":"短い意味"}]}`,
  toKanji: ([p]) =>
    `${describe(p)} を表す漢字1字(無理なら熟語)に。{"outputs":[{"kind":"kanji","text":"字"}]}`,
  interpret: ([p]) =>
    `${describe(p)} は意味の通らないもの。無理やり解釈して意味にして。{"outputs":[{"kind":"meaning","text":"絵文字","gloss":"こじつけた意味"}]}`,
  compose: ([a, b]) =>
    `「${a.text}」と「${b.text}」を字面として組み合わせてできる実在の漢字1字は？` +
    `あれば {"outputs":[{"kind":"kanji","text":"字"}]}、無ければ {"outputs":[{"kind":"chimera","text":"${a.text}${b.text}"}]}`,
  join: ([a, b]) =>
    `「${a.text}${b.text}」は実在する熟語？` +
    `あれば {"outputs":[{"kind":"word","text":"${a.text}${b.text}","gloss":"意味"}]}、無ければ {"outputs":[{"kind":"nonword","text":"${a.text}${b.text}"}]}`,
  blend: ([a, b]) =>
    `${describe(a)} と ${describe(b)} を合わせると自然な1つの意味になる？` +
    `なれば {"outputs":[{"kind":"meaning","text":"絵文字","gloss":"意味"}]}、ならなければ {"outputs":[{"kind":"nonsense","text":"${a.text}${b.text}"}]}`,
};

export async function askHenge(method: HengeMethodId_変化の方法, pieces: Piece_もの[]): Promise<PieceSeed_ものの種[]> {
  const res = await askAIForJson<Out>({ instructions: ROLE, input: PROMPTS[method](pieces) });
  const outputs = (res.outputs ?? []).filter((o) => o && typeof o.text === "string" && o.text.length > 0);
  if (outputs.length === 0) throw new Error("AI が結果を返しませんでした");
  return outputs;
}

export type PuzzleDraft = { start: string; goal: string; wallet: number; items: PieceSeed_ものの種[] };

/** 盤面を作る */
export async function askPuzzle(): Promise<PuzzleDraft> {
  const res = await askAIForJson<{ start: string; goal: string; cost: number; items: PieceSeed_ものの種[] }>({
    instructions: ROLE,
    input:
      "新しい盤面を作って。スタートの漢字1字からゴールの漢字1字へ、" +
      "分解する/読む(読み→同じ読みの別の字にできる)/意味にする/字にする/組む(偏旁を合わせて字)/繋ぐ(熟語)/合わせる(意味同士) で" +
      "3〜5手でたどり着けるようにし、途中で使う部品や字を items に3〜5個(おとり1個含む)入れる。" +
      '{"start":"字","goal":"字","cost":解くのに必要な最小バケ(分解1,読む1,組む1,繋ぐ1,意味にする2,字にする2,合わせる2),' +
      '"items":[{"kind":"kanji|radical|reading|meaning","text":"...","gloss":"任意"}]}',
  });
  // 最初のバケ = 解き方の費用 + 余裕
  return { start: res.start, goal: res.goal, wallet: Math.max(6, (res.cost ?? 5) + 4), items: res.items ?? [] };
}
