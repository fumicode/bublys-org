/**
 * **読み解いた 1 件を、ほかのバブリが受け取れる形にする。**
 *
 * > 読み解くのはメモの仕事。形にするのは旅程の仕事。
 *
 * ★ メモは `readNote` の結果を**役を名乗る形で差し出す**だけ。旅程は
 *   「題名を名乗るものを全部拾う」しか知らないので、**メモを import しない**。
 *   地図も同じものから場所だけ拾える ── 渡し先ごとに書き直さずに済む。
 * ★ 幅のある数（`2〜3時間`）は、**数と書かれたままの両方**を載せる。
 *   数は役として渡し、書かれたままは画面に出すため ── 丸めた数だけを渡すと、
 *   受け取った側が「1,500 円」と言い切ってしまう。
 */
import {
  arrayShape,
  objectRefShape,
  objectShape,
  primitiveShape,
  type SchemaShape,
} from "@bublys-org/domain-registry/schema";
import type { ObjectRef } from "@bublys-org/bubbles-ui";
import { representative } from "./Approx.js";
import type { NoteItem } from "./readNote.js";

export type NoteItemPlain = {
  id: string;
  title: string;
  /** `plan` / `task` / `note` */
  kind: string;
  /** `MM-DD` か `#N`（何日目）。分からなければ空 */
  date: string;
  /** 何時からか（その日の 0 時からの分）。分からなければ -1 */
  startMin: number;
  /** どれくらいか（分） */
  durationMin: number;
  /** いくらか（円） */
  cost: number;
  /** 書かれたまま（`2〜3時間` `1500〜2000円`）。画面にはこちらを出す */
  durationRaw: string;
  costRaw: string;
  /** どこか */
  place?: ObjectRef;
  /** この 1 件を開く先 */
  url: string;
  /** どの印から読んだか */
  found: string[];
  /** どちらか一方（両方は入れない） */
  alternatives: string[];
  /** 済んだやること */
  done: boolean;
  booking: boolean;
  /** どの見出しの下に書いてあったか */
  group: string;
};

/** 1 件を開く先。行の id で引ける（行の id はメモをまたいで重ならない） */
export const noteItemUrl = (lineId: string): string => `note-items/${lineId}`;

/** `MM-DD` か `#N`。どちらも分からなければ空 */
const dateTextOf = (item: NoteItem): string => {
  if (item.date?.nth !== undefined) return `#${item.date.nth}`;
  if (item.date?.month !== undefined && item.date.day) {
    return `${pad(item.date.month)}-${pad(item.date.day)}`;
  }
  return "";
};

const pad = (n: number): string => String(n).padStart(2, "0");

export const toNoteItemPlain = (item: NoteItem): NoteItemPlain => ({
  id: item.id,
  title: item.title,
  kind: item.kind,
  date: dateTextOf(item),
  startMin: item.startMin ? representative(item.startMin) : -1,
  durationMin: item.duration ? representative(item.duration) : 0,
  cost: item.money ? representative(item.money) : 0,
  durationRaw: item.duration?.raw ?? "",
  costRaw: item.money?.raw ?? "",
  place: item.place,
  url: noteItemUrl(item.lineId),
  found: [...item.found],
  alternatives: item.alternatives ? [...item.alternatives] : [],
  done: item.done ?? false,
  booking: item.booking ?? false,
  group: item.section ?? "",
});

/**
 * 1 件の形。**役を名乗るのはここ**。
 *
 * ★ `kind` や `alternatives` には役を付けない ── メモの中の事情であって、
 *   ほかのバブリが共通に要るものではない（役を足してよいのは 2 つ以上が要ったとき）。
 *   受け取る側は、これらを知らないまま題名と時間と金額と場所だけ使える。
 */
export const NOTE_ITEM_SHAPE: SchemaShape = objectShape([
  { name: "id", shape: primitiveShape("string"), required: true, label: "ID" },
  { name: "title", shape: primitiveShape("string"), required: true, label: "内容", role: "title" },
  { name: "kind", shape: primitiveShape("string"), required: true, label: "種類" },
  { name: "date", shape: primitiveShape("string"), required: true, label: "いつ", role: "date" },
  { name: "startMin", shape: primitiveShape("number"), required: true, label: "開始（分）", role: "time" },
  { name: "durationMin", shape: primitiveShape("number"), required: true, label: "長さ（分）", role: "duration" },
  { name: "cost", shape: primitiveShape("number"), required: true, label: "費用", role: "money" },
  { name: "durationRaw", shape: primitiveShape("string"), required: true, label: "長さ（書かれたまま）" },
  { name: "costRaw", shape: primitiveShape("string"), required: true, label: "費用（書かれたまま）" },
  { name: "place", shape: objectRefShape(), required: false, label: "場所", role: "place" },
  { name: "url", shape: primitiveShape("string"), required: true, label: "開く先", role: "address" },
  { name: "found", shape: arrayShape(primitiveShape("string")), required: true, label: "拾った印" },
  { name: "alternatives", shape: arrayShape(primitiveShape("string")), required: true, label: "どちらか" },
  { name: "done", shape: primitiveShape("boolean"), required: true, label: "済んだ" },
  { name: "booking", shape: primitiveShape("boolean"), required: true, label: "要予約" },
  { name: "group", shape: primitiveShape("string"), required: true, label: "仲間", role: "group" },
]);
