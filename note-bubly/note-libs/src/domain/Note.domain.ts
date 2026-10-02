/**
 * **メモ** ── 自由に書く所。行の並びで持つ。
 *
 * ★ **子はインスタンス**（`NoteLine_行[]`）。保存形は別に定義して、`toPlain` /
 *   `fromPlain` の 1 か所だけが行き来する（CLAUDE.md 規則 2）。
 * ★ メモは**読み解いた結果を持たない**。読み解きは行から毎回出す（`readNote`）
 *   ── 持つと、書き換えたのに古い読みが残る。
 */
import {
  arrayShape,
  objectShape,
  primitiveShape,
  type SchemaShape,
} from "@bublys-org/domain-registry/schema";
import { NOTE_ITEM_SHAPE } from "./read/NoteItemPlain.js";
import {
  NOTE_LINE_SHAPE,
  NoteLine_行,
  type LineMark,
  type NoteLinePlain,
} from "./NoteLine.domain.js";

export type NotePlain = {
  id: string;
  title: string;
  lines: NoteLinePlain[];
};

export class Note_メモ {
  constructor(readonly state: { id: string; title: string; lines: NoteLine_行[] }) {}

  get id(): string { return this.state.id; }
  get title(): string { return this.state.title; }
  get lines(): readonly NoteLine_行[] { return this.state.lines; }

  line(lineId: string): NoteLine_行 | undefined {
    return this.state.lines.find((l) => l.id === lineId);
  }

  indexOf(lineId: string): number {
    return this.state.lines.findIndex((l) => l.id === lineId);
  }

  withTitle(title: string): Note_メモ {
    return new Note_メモ({ ...this.state, title });
  }

  /** 1 行を置き換える */
  withLine(line: NoteLine_行): Note_メモ {
    return new Note_メモ({
      ...this.state,
      lines: this.state.lines.map((l) => (l.id === line.id ? line : l)),
    });
  }

  /** 行の印を入れ替える（ボタン 1 つで付く／外れる） */
  toggleMark(lineId: string, mark: LineMark): Note_メモ {
    const line = this.line(lineId);
    return line ? this.withLine(line.toggle(mark)) : this;
  }

  /**
   * 行を足す。`after` の次に入れる（渡さなければ末尾）。
   *
   * ★ **字下げは前の行を継ぐ。** 箇条書きの途中で改行したら、同じ深さで続くのが
   *   人の期待どおり ── 毎回 0 に戻ると、書くたびに押し直すことになる。
   */
  withNewLineAfter(afterLineId: string | undefined, id: string): Note_メモ {
    const at = afterLineId ? this.indexOf(afterLineId) : this.state.lines.length - 1;
    const prev = at >= 0 ? this.state.lines[at] : undefined;
    const fresh = NoteLine_行.blank(id).withIndent(prev?.indent ?? 0);
    const lines = [...this.state.lines];
    lines.splice(at + 1, 0, fresh);
    return new Note_メモ({ ...this.state, lines });
  }

  /**
   * 行を消す。**最後の 1 行は消さない** ── 書く所が無くなると、
   * 空のメモから書き始められなくなる。
   */
  withoutLine(lineId: string): Note_メモ {
    if (this.state.lines.length <= 1) return this;
    return new Note_メモ({
      ...this.state,
      lines: this.state.lines.filter((l) => l.id !== lineId),
    });
  }

  toPlain(): NotePlain {
    return {
      id: this.state.id,
      title: this.state.title,
      lines: this.state.lines.map((l) => l.toPlain()),
    };
  }

  static fromPlain(plain: NotePlain): Note_メモ {
    const lines = (plain.lines ?? []).map(NoteLine_行.fromPlain);
    return new Note_メモ({
      id: plain.id,
      title: plain.title,
      lines: lines.length > 0 ? lines : [NoteLine_行.blank(`${plain.id}-1`)],
    });
  }

  static create(id: string, title: string): Note_メモ {
    return new Note_メモ({ id, title, lines: [NoteLine_行.blank(`${id}-1`)] });
  }
}

/**
 * メモの形。
 *
 * ★ **`items` が、ほかのバブリに渡るもの。** 行（`lines`）は書くためのもので、
 *   受け取る側には読めない（役を名乗っていない）。読み解いた結果だけが役を名乗る。
 *   だから旅程は「題名を名乗るものを全部拾う」だけで、メモを知らないまま形にできる。
 * ★ `items` は**保存しない**。訊かれたときに `readNote` で毎回出す
 *   （`object-type-registration.ts`）── 溜めると、書き換えたのに古い読みが残る。
 */
export const NOTE_SHAPE: SchemaShape = objectShape([
  { name: "id", shape: primitiveShape("string"), required: true, label: "ID" },
  { name: "title", shape: primitiveShape("string"), required: true, label: "題名", role: "title" },
  { name: "lines", shape: arrayShape(NOTE_LINE_SHAPE), required: true, label: "行" },
  { name: "items", shape: arrayShape(NOTE_ITEM_SHAPE), required: false, label: "読み解いた結果" },
]);
