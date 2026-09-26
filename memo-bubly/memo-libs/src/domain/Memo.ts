/**
 * **メモ** ── 段落（ブロック）が順に並んだもの。
 *
 * > **持つのは並び。番号札の列と対応表に割るのは、しまうときだけ。**
 *
 * ★ 前は `state` が保存形そのものだった ── 並びを「番号札の列（`lines`）」と
 *   「番号札 → 中身の対応表（`blocks`）」の**二つに割って**持っていた。
 *   画面に出るのは二つが噛み合ったときだけなので、**片方だけ埋まったメモは
 *   存在するのに何も映らない**。外から作るときに二箇所を同時に正しく埋める必要があり、
 *   変換エディタからは「名前の決まっていない対応表」にしか見えなかった。
 *   CLAUDE.md の「`state` はドメインの形であって、保存形ではない」がこれに当たる。
 * ★ **保存形（{@link MemoPlain}）は変えていない。** すでに保存されているメモを
 *   読めなくしないため ── 割るのも戻すのも {@link Memo.toPlain} / {@link Memo.fromPlain} の中だけ。
 */
import { arrayShape, objectShape, primitiveShape, type SchemaShape } from "@bublys-org/domain-registry/schema";

/** 段落 1 つ。`id` は画面が焦点を追いかけるのに要る（並び順は持たない） */
export type MemoBlock = {
  id: string;
  type: string;
  content: string;
};

/**
 * **しまうときの形。** 番号札の列と対応表に割ってある。
 * ここを読み書きしてよいのは {@link Memo.toPlain} / {@link Memo.fromPlain} だけ。
 */
export type MemoPlain = {
  id: string;
  blocks: {
    [blockId: string]: MemoBlock;
  };
  lines: string[];
  authorId?: string | null;
};

/** メモの形（ドメインの形）。子は**並び**で持つ */
export type MemoState = {
  id: string;
  blocks: MemoBlock[];
  authorId: string | null;
};

export class Memo {
  readonly state: MemoState;

  constructor(state: MemoState) {
    this.state = {
      id: state.id,
      blocks: state.blocks.map((b) => ({ ...b })),
      authorId: state.authorId ?? null,
    };
  }

  get id(): string {
    return this.state.id;
  }

  /** 段落の並び。**この順番がそのまま画面の順番** */
  get blocks(): readonly MemoBlock[] {
    return this.state.blocks;
  }

  get authorId(): string | null {
    return this.state.authorId;
  }

  /**
   * **名前は中身が決める** ── 1 行目をそのまま返す（前後の空白は落とす）。
   * まだ何も書かれていなければ空文字。「無題」と言うのは見せる側の仕事。
   *
   * ★ 前は「1 行目の番号札を引いて、対応表から中身を引く」を**四箇所が別々に**書いていた。
   *   同じことを四回書けば、四回とも同じ形で壊れる（実測：番号札が消えたメモで軒並み落ちた）。
   */
  get title(): string {
    return this.state.blocks[0]?.content.trim() ?? "";
  }

  /** その段落の次（末尾なら undefined）。画面が焦点を動かすのに使う */
  getNextBlockId(currentId: string): string | undefined {
    const i = this.indexOf(currentId);
    return i >= 0 ? this.state.blocks[i + 1]?.id : undefined;
  }

  /** その段落の前（先頭なら undefined） */
  getPrevBlockId(currentId: string): string | undefined {
    const i = this.indexOf(currentId);
    return i > 0 ? this.state.blocks[i - 1].id : undefined;
  }

  private indexOf(blockId: string): number {
    return this.state.blocks.findIndex((b) => b.id === blockId);
  }

  private withBlocks(blocks: MemoBlock[]): Memo {
    return new Memo({ ...this.state, blocks });
  }

  /** その段落のうしろに、新しい段落を差し込む */
  insertTextBlockAfter(
    afterId: string,
    type: string,
    content = "",
  ): { memo: Memo; newBlockId: string } {
    const newBlock: MemoBlock = { id: crypto.randomUUID(), type, content };
    const blocks = [...this.state.blocks];
    blocks.splice(this.indexOf(afterId) + 1, 0, newBlock);
    return { memo: this.withBlocks(blocks), newBlockId: newBlock.id };
  }

  /** その段落の中身を書き換える。無い段落なら何もしない */
  updateBlockContent(blockId: string, content: string): Memo {
    const i = this.indexOf(blockId);
    if (i < 0) return this;
    const blocks = [...this.state.blocks];
    blocks[i] = { ...blocks[i], content };
    return this.withBlocks(blocks);
  }

  /** その段落を、ひとつ前の段落の末尾へ繋げる。先頭なら何もしない */
  mergeBlock(blockId: string): Memo {
    const i = this.indexOf(blockId);
    if (i <= 0) return this;
    const blocks = [...this.state.blocks];
    blocks[i - 1] = { ...blocks[i - 1], content: blocks[i - 1].content + blocks[i].content };
    blocks.splice(i, 1);
    return this.withBlocks(blocks);
  }

  mergeWithPrevious(blockId: string): Memo {
    return this.mergeBlock(blockId);
  }

  setAuthor(userId: string | null): Memo {
    return new Memo({ ...this.state, authorId: userId });
  }

  /**
   * しまう形にする ── ここで**はじめて**番号札の列と対応表に割る。
   * 割るのはこの 1 箇所だけ（CLAUDE.md「plain 化は記録する 1 箇所でやる」）。
   */
  toPlain(): MemoPlain {
    const blocks: MemoPlain["blocks"] = {};
    for (const b of this.state.blocks) blocks[b.id] = { ...b };
    return {
      id: this.state.id,
      blocks,
      lines: this.state.blocks.map((b) => b.id),
      authorId: this.state.authorId,
    };
  }

  /**
   * しまってある形から戻す。番号札の列の順に段落を並べ直す。
   *
   * ★ **食い違っていても捨てない。** 番号札があるのに段落が無ければ飛ばし、
   *   列に載っていない段落は末尾に足す ── 保存されているものは、
   *   割れていた頃の食い違いを抱えていることがある（片方だけ書かれた更新が残り得た）。
   *   ここで落とすと、書いた本人にはただ**文章が消えた**ようにしか見えない。
   */
  static fromPlain(plain: MemoPlain): Memo {
    const lines = plain.lines ?? [];
    const table = plain.blocks ?? {};
    const ordered = lines.map((id) => table[id]).filter((b): b is MemoBlock => !!b);
    const seen = new Set(ordered.map((b) => b.id));
    const orphans = Object.values(table).filter((b) => !seen.has(b.id));
    return new Memo({
      id: plain.id,
      blocks: [...ordered, ...orphans].map((b) => ({ ...b })),
      authorId: plain.authorId ?? null,
    });
  }

  /**
   * 新しい Memo を作る。**中身は空**。
   *
   * ★ 前は「新しいメモの内容です。」を 1 行目に書き込んでいた。見出しは 1 行目から取るので
   *   名前のつもりだったのだろうが、**データに入っている**ので書き始める前に消す手間が要る
   *   ── 置き手紙ではなく、消さないと邪魔になるゴミになっていた。
   *   名前は中身が決める。中身が無いうちは、見せる側が「無題」と言えばよい。
   */
  static create(): Memo {
    return new Memo({
      id: crypto.randomUUID(),
      blocks: [{ id: crypto.randomUUID(), type: "text", content: "" }],
      authorId: null,
    });
  }
}

/**
 * **メモの形**（`SchemaShape`）── 他のバブリが「この型の中身は何か」を引くための申告。
 *
 * ★ 名乗るのは**ドメインの形**であって、しまう形（{@link MemoPlain}）ではない。
 *   割ってあるのはメモの内輪の都合なので、外にはひとつの並びとして見せる。
 * ★ 前は「番号札の列」と「名前の決まっていない対応表」を申告していたので、
 *   本文は `record` としてまるごと 1 つの繋ぎ先にしかならなかった。
 *   並びで持つようになったので、**中の項目に道が引ける**（`blocks` の中身）。
 */
export const MEMO_SHAPE: SchemaShape = objectShape([
  { name: 'id', shape: primitiveShape('string'), required: true, label: 'ID' },
  {
    name: 'blocks',
    shape: arrayShape(
      objectShape([
        { name: 'id', shape: primitiveShape('string'), required: true, label: '段落 ID' },
        { name: 'type', shape: primitiveShape('string'), required: true, label: '種類' },
        { name: 'content', shape: primitiveShape('string'), required: true, label: '中身' },
      ]),
    ),
    required: true,
    label: '段落の並び',
  },
  { name: 'authorId', shape: primitiveShape('string'), required: false, label: '書いた人の ID' },
]);
