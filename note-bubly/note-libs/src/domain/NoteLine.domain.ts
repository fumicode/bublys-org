/**
 * **メモの 1 行。**
 *
 * > 中は形を持つが、書く人にはただのメモに見える。
 *
 * ★ **装飾がそのまま意味になる。** 見出しにすれば下の行の主語になり、字下げすれば
 *   上の行の属性になり、取り消せば拾われなくなる。だから装飾は飾りではなく、
 *   **書いた人が「これはこういうものだ」と言った印**として扱う。
 *   別に「種類」を選ばせる欄を作らないのは、それだと書くのと分類するのが 2 手になるから。
 * ★ 文字の中に**指**（ほかのバブリのもの）が混ざる。埋め込みは `@{型:id}` の目印で、
 *   描くときに札へ置き換える ── 名前は持ち主に訊くので、向こうで直せばここも直る。
 */
import { objectShape, primitiveShape, arrayShape, type SchemaShape } from "@bublys-org/domain-registry/schema";
import type { ObjectRef } from "@bublys-org/bubbles-ui";

/** 行に付けられる印。重ねられる（太字のチェック、など） */
export type LineMark = "strong" | "strike" | "quote" | "todo" | "done";

export const LINE_MARKS: readonly LineMark[] = ["strong", "strike", "quote", "todo", "done"];

export type NoteLinePlain = {
  id: string;
  /** 書かれた文字。指は `@{型:id}` の目印で埋まっている */
  text: string;
  /** 見出しの深さ。0 は本文、1〜3 が見出し */
  heading: number;
  /** 字下げの深さ（0 から） */
  indent: number;
  /** 付いている印 */
  marks: LineMark[];
};

/** 指の目印。`@{Spot:hakone-jinja}` */
const REF_PATTERN = /@\{([A-Za-z][A-Za-z0-9-]*):([^}]+)\}/g;

export class NoteLine_行 {
  constructor(readonly state: NoteLinePlain) {}

  get id(): string { return this.state.id; }
  get text(): string { return this.state.text; }
  get heading(): number { return this.state.heading; }
  get indent(): number { return this.state.indent; }
  get marks(): readonly LineMark[] { return this.state.marks; }

  has(mark: LineMark): boolean { return this.state.marks.includes(mark); }

  /** 見出しか */
  get isHeading(): boolean { return this.state.heading > 0; }

  /** やることか（チェックが付いているか） */
  get isTask(): boolean { return this.has("todo") || this.has("done"); }

  /**
   * **拾わない行か。**
   * 取り消した行と引用は読み解きから外す ── 取り消しは「やめた」、引用は「人の言葉」。
   */
  get isIgnored(): boolean { return this.has("strike") || this.has("quote"); }

  /** 空行か（区切りとしてだけ意味を持つ） */
  get isBlank(): boolean { return this.state.text.trim() === ""; }

  /** この行が指しているもの */
  get refs(): ObjectRef[] {
    return [...this.state.text.matchAll(REF_PATTERN)].map((m) => ({ type: m[1], id: m[2] }));
  }

  /** 指の目印を抜いた、読める文字（印を拾うときはこちらを見る） */
  get plainText(): string {
    return this.state.text.replace(REF_PATTERN, " ").replace(/\s+/g, " ").trim();
  }

  /**
   * 指を名前に置き換えた文字。名前の引き方は外から渡す
   * （**誰が持ち主かをこの層は知らない**）。
   */
  textWith(nameOf: (ref: ObjectRef) => string | undefined): string {
    return this.state.text.replace(REF_PATTERN, (_, type: string, id: string) =>
      nameOf({ type, id }) ?? id,
    );
  }

  withText(text: string): NoteLine_行 {
    return new NoteLine_行({ ...this.state, text });
  }

  /** 見出しの深さを変える。同じ深さをもう一度押したら本文に戻す */
  withHeading(heading: number): NoteLine_行 {
    return new NoteLine_行({
      ...this.state,
      heading: this.state.heading === heading ? 0 : Math.max(0, Math.min(3, heading)),
    });
  }

  /** 字下げを変える。0 より浅くはならない */
  withIndent(indent: number): NoteLine_行 {
    return new NoteLine_行({ ...this.state, indent: Math.max(0, Math.min(4, indent)) });
  }

  /**
   * 印を入れ替える（付いていれば外す）。
   *
   * ★ 未チェックと済みは**同じ 1 つの印の 2 つの顔**。両方付くことはない。
   */
  toggle(mark: LineMark): NoteLine_行 {
    const has = this.has(mark);
    let marks = this.state.marks.filter((m) => m !== mark);
    if (mark === "todo") marks = marks.filter((m) => m !== "done");
    if (mark === "done") marks = marks.filter((m) => m !== "todo");
    if (!has) marks = [...marks, mark];
    return new NoteLine_行({ ...this.state, marks });
  }

  /** 文字に指を挿す（掴んで落としたとき） */
  withRefInserted(ref: ObjectRef, at?: number): NoteLine_行 {
    const mark = `@{${ref.type}:${ref.id}}`;
    const text = this.state.text;
    const pos = at === undefined ? text.length : Math.max(0, Math.min(at, text.length));
    const before = text.slice(0, pos);
    const after = text.slice(pos);
    const glue = before && !before.endsWith(" ") ? " " : "";
    return this.withText(`${before}${glue}${mark}${after}`);
  }

  toPlain(): NoteLinePlain {
    return { ...this.state, marks: [...this.state.marks] };
  }

  static fromPlain(plain: NoteLinePlain): NoteLine_行 {
    return new NoteLine_行({ ...plain, marks: [...(plain.marks ?? [])] });
  }

  static blank(id: string): NoteLine_行 {
    return new NoteLine_行({ id, text: "", heading: 0, indent: 0, marks: [] });
  }
}

export const NOTE_LINE_SHAPE: SchemaShape = objectShape([
  { name: "id", shape: primitiveShape("string"), required: true, label: "ID" },
  { name: "text", shape: primitiveShape("string"), required: true, label: "本文" },
  { name: "heading", shape: primitiveShape("number"), required: true, label: "見出しの深さ" },
  { name: "indent", shape: primitiveShape("number"), required: true, label: "字下げ" },
  { name: "marks", shape: arrayShape(primitiveShape("string")), required: true, label: "印" },
]);
