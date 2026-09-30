/**
 * **メモを読み解く。**
 *
 * > **上の行が、下の行の主語になる。**
 *
 * これが唯一の構造の決まり。
 *
 *   - **見出しの下の行**は、その見出しのこと（`5/17` の下は 5/17 の話）
 *   - **字下げした行**は、すぐ上の行のこと（`箱根神社` の下の `¥1,500` はその予定の話）
 *   - **数と印しか書いていない行**も、すぐ上の行のこと（字下げを忘れても拾う ＝ 近さ）
 *
 * 人がメモで無意識にやっていることを、そのまま読んでいるだけ。だから
 * **なぜそう読んだかを必ず言える** ── 言えれば、外れていても直せる。
 *
 * ★ 散文の意味は取りにいかない。取ると、外したときに理由が言えなくなる。
 * ★ 拾えなかったものは**拾えなかったままにする**。それらしく埋めない。
 * ★ ここは純粋な関数。名前の解決（指 → 名前）は**しない** ── 誰が持ち主かを
 *   この層は知らないので、名前が要るところは呼んだ側が埋める。
 */
import type { ObjectRef } from "@bublys-org/bubbles-ui";
import type { Note_メモ } from "../Note.domain.js";
import type { NoteLine_行 } from "../NoteLine.domain.js";
import { representative, type Approx } from "./Approx.js";
import {
  findCommitment,
  findDate,
  findDuration,
  findEither,
  findLeg,
  findMoney,
  findOpeningNote,
  findPeople,
  findTime,
  findTransport,
  needsBooking,
  type Commitment,
  type FoundDate,
  type FoundLeg,
  type Transport,
} from "./tokens.js";

/**
 * 読み解いて出てきた 1 件。
 *
 * ★ `title` は**空のことがある**（行に指しか書いていないとき）。
 *   そのときの名前は指の持ち主に訊く ── 呼んだ側の仕事。
 */
export type NoteItem = {
  readonly id: string;
  /** どの行から来たか。画面で「ここから読みました」と言うのに使う */
  readonly lineId: string;
  readonly title: string;
  /** 予定になれるもの / やること / ただのメモ */
  readonly kind: "plan" | "task" | "note";
  /** 済んだやること */
  readonly done?: boolean;
  /** 何月何日の話か（見出しから継ぐ） */
  readonly date?: FoundDate;
  /** 何時からか */
  readonly startMin?: Approx;
  /** どれくらいか */
  readonly duration?: Approx;
  /** いくらか */
  readonly money?: Approx;
  /** どこか（指。ほかのバブリのもの） */
  readonly place?: ObjectRef;
  /** どこからどこへ */
  readonly leg?: FoundLeg;
  readonly transport?: Transport;
  readonly commitment: Commitment;
  readonly booking?: boolean;
  readonly openingNote?: string;
  readonly people?: { count?: number; names: string[] };
  /** 「AかB」── どちらか一方。両方は入れない */
  readonly alternatives?: string[];
  /** 見出しから継いだ区切りの名前（「1日目」「食事」など） */
  readonly section?: string;
  /** どの印から読んだか。画面に出して、外れていたら直させる */
  readonly found: string[];
};

/** 見出しが作る文脈。深さごとに積む */
type Context = {
  date?: FoundDate;
  place?: ObjectRef;
  people?: { count?: number; names: string[] };
  section?: string;
};

export const readNote = (note: Note_メモ): NoteItem[] => {
  const items: NoteItem[] = [];
  /** 見出しの深さ → その見出しが決めた文脈 */
  const stack: Context[] = [];
  /** 直前に作った 1 件（字下げした行・数だけの行はここへ足す） */
  let last: { item: NoteItem; indent: number } | undefined;

  for (const line of note.lines) {
    if (line.isBlank) {
      // 空行は区切り。**近さ**はここで切れる（続きではなくなる）
      last = undefined;
      continue;
    }
    if (line.isIgnored) continue;

    const read = readLine(line);

    if (line.isHeading) {
      // 見出しはそれ自身が 1 件にはならない。下の行の主語になるだけ
      const depth = line.heading;
      stack.length = Math.max(0, depth - 1);
      stack[depth - 1] = {
        date: read.date,
        place: read.place,
        people: read.people,
        section: read.title || undefined,
      };
      last = undefined;
      continue;
    }

    const ctx = mergeContext(stack);

    /**
     * **上の行の続きか。**
     * 字下げが深いか、あるいは**言葉が無く印だけ**の行なら、直前の 1 件の属性。
     * 後者が「近さ」── 字下げを忘れても、数だけの行は上に付く。
     */
    const isAttribute =
      last !== undefined && (line.indent > last.indent || (read.title === "" && read.found.length > 0));

    if (isAttribute && last) {
      const merged = mergeInto(last.item, read);
      items[items.indexOf(last.item)] = merged;
      last = { item: merged, indent: last.indent };
      continue;
    }

    const item: NoteItem = {
      id: line.id,
      lineId: line.id,
      title: read.title,
      kind: line.isTask ? "task" : read.found.length > 0 || read.place ? "plan" : "note",
      done: line.has("done") || undefined,
      date: read.date ?? ctx.date,
      startMin: read.startMin,
      duration: read.duration,
      money: read.money,
      place: read.place ?? ctx.place,
      leg: read.leg,
      transport: read.transport,
      /**
       * ★ **太字は「強い」**。書いた人がわざわざ目立たせたのだから、
       *   ほかに何も書いていなければ「行きたい」と読む。
       */
      commitment: read.commitment ?? (line.has("strong") ? "want" : "maybe"),
      booking: read.booking,
      openingNote: read.openingNote,
      people: read.people ?? ctx.people,
      alternatives: read.alternatives,
      section: ctx.section,
      found: read.found,
    };
    items.push(item);
    last = { item, indent: line.indent };
  }

  return items;
};

// ========== 1 行ぶんを読む ==========

type LineRead = {
  title: string;
  date?: FoundDate;
  startMin?: Approx;
  duration?: Approx;
  money?: Approx;
  place?: ObjectRef;
  leg?: FoundLeg;
  transport?: Transport;
  commitment?: Commitment;
  booking?: boolean;
  openingNote?: string;
  people?: { count?: number; names: string[] };
  alternatives?: string[];
  found: string[];
};

const readLine = (line: NoteLine_行): LineRead => {
  const text = line.plainText;
  /** 拾った印ぜんぶ（画面に出す） */
  const found: string[] = [];
  /**
   * **題名から取り除いてよい印。**
   *
   * ★ 取り除くのは「数」と「それ自体は名前になりえない言葉」だけ。
   *   移動手段や人の名は**名前の一部でありうる**ので残す ── 削っていたころ、
   *   「芦ノ湖遊覧船」が「芦ノ湖」になっていた（`遊覧船` を手段として削っていた）。
   */
  const strip: string[] = [];
  const note = (raw: string | undefined, removable: boolean) => {
    if (!raw) return;
    found.push(raw);
    if (removable) strip.push(raw);
  };

  const date = findDate(text);
  note(date?.raw, true);
  /**
   * ★ **時刻と長さは、長さを先に見る。**「1時間」は長さであって 1 時ではない。
   *   先に時刻を見ると、滞在時間を開始時刻と読み違える。
   */
  const duration = findDuration(text);
  note(duration?.raw, true);
  const startMin = duration ? findTimeAvoiding(text, duration.raw) : findTime(text);
  note(startMin?.raw, true);
  /** ★ 長さとして読んだ所は、金額として読み直さない（`2〜3時間` の `2〜3`） */
  const money = findMoney(duration ? text.split(duration.raw).join(" ") : text);
  note(money?.raw, true);
  const openingNote = findOpeningNote(text);
  note(openingNote, true);
  const booking = needsBooking(text);
  if (booking) note("要予約", true);
  const commitment = findCommitment(text);
  note(commitment?.raw, true);

  // ここから下は**名前の一部でありうる**ので、題名からは削らない
  const transport = findTransport(text);
  note(transport?.raw, false);
  const people = findPeople(text);
  note(people?.raw, false);
  const leg = findLeg(text);
  note(leg?.raw, false);
  const alternatives = findEither(text);

  /**
   * 題名は**削ってよい印を取り除いた残り**。全部が印だったら空になる ── それは
   * 「上の行の属性」の合図（近さの決まり）。
   */
  let title = text;
  for (const raw of strip) title = title.split(raw).join(" ");
  title = title.replace(/[、,。・:：\-–—]/g, " ").replace(/\s+/g, " ").trim();

  return {
    title,
    date,
    startMin,
    duration,
    money,
    place: line.refs[0],
    leg,
    transport: transport?.transport,
    commitment: commitment?.commitment,
    booking: booking || undefined,
    openingNote,
    people,
    alternatives,
    found,
  };
};

/** 長さとして読んだ所は、時刻として読み直さない */
const findTimeAvoiding = (text: string, durationRaw: string): Approx | undefined =>
  findTime(text.split(durationRaw).join(" "));

// ========== 継ぐ・足す ==========

/** 浅い見出しから順に重ねる。深いほうが勝つ */
const mergeContext = (stack: Context[]): Context => {
  const out: Context = {};
  for (const c of stack) {
    if (!c) continue;
    if (c.date) out.date = c.date;
    if (c.place) out.place = c.place;
    if (c.people) out.people = c.people;
    if (c.section) out.section = c.section;
  }
  return out;
};

/**
 * 属性の行を、上の 1 件へ足す。
 *
 * ★ **上書きしない。** 先に書いてあったほうを残す ── 後から足した行は補足であって、
 *   訂正とは限らない。訂正したいなら、その行そのものを直せばよい。
 */
const mergeInto = (item: NoteItem, read: LineRead): NoteItem => ({
  ...item,
  /**
   * ★ **属性が付いたら、ただのメモではなくなる。**
   *   「昼食」だけの行は言葉しか無いのでただのメモだが、下に「1500〜2000円」と
   *   書いてあれば、それは予定になれるもの。やること（チェック）はやることのまま。
   */
  kind: item.kind === "note" && read.found.length > 0 ? "plan" : item.kind,
  startMin: item.startMin ?? read.startMin,
  duration: item.duration ?? read.duration,
  money: item.money ?? read.money,
  place: item.place ?? read.place,
  leg: item.leg ?? read.leg,
  transport: item.transport ?? read.transport,
  booking: item.booking ?? read.booking,
  openingNote: item.openingNote ?? read.openingNote,
  people: item.people ?? read.people,
  commitment: read.commitment ?? item.commitment,
  // 補足に言葉があれば、題名の後ろに足す（消さない）
  title: read.title && !item.title.includes(read.title) ? `${item.title} ${read.title}`.trim() : item.title,
  found: [...item.found, ...read.found],
});

/** 数として 1 つ要るときの値（合計や時刻に使う） */
export const numberOf = (a: Approx | undefined): number | undefined =>
  a === undefined ? undefined : representative(a);
