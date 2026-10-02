/**
 * **予定** ── 旅程の 1 行。「何時から何時まで、何をするか」。
 *
 * ★ 時刻は**その日の 0 時からの分**で持つ。「08:30」の文字列で持つと、
 *   終わりの時刻を出すたびに文字列を切って足して詰め直すことになる
 *   ── アクティビティを落として「所要時間ぶん後ろ」を出すのが旅程の主な仕事なので、
 *   足し算ができる形にしておく。読む形（`08:30`）は出すときに作る。
 * ★ 場所も中身も持たない ── 地点は `spotId`、アクティビティは `activityId` で指すだけ。
 */
import {
  enumShape,
  objectRefShape,
  objectShape,
  primitiveShape,
  type SchemaShape,
} from "@bublys-org/domain-registry/schema";
import type { ObjectRef } from "@bublys-org/bubbles-ui";

/** 予定の種類。行の左に出る印はこれで決まる */
export type ItineraryKind_種類 = "move" | "meal" | "sightseeing" | "stay" | "other";

export type ItineraryItemPlain = {
  id: string;
  /** その日の 0 時からの分（8:30 なら 510） */
  startMin: number;
  endMin: number;
  title: string;
  kind: ItineraryKind_種類;
  /** 費用（円）。宿泊費のように別勘定のものは 0 にして `costNote` に書く */
  cost: number;
  /** 費用の但し書き（「宿泊費別」など）。無ければ金額をそのまま出す */
  costNote?: string;
  /**
   * **立ち寄り先への指**（型と id）。
   *
   * ★ 前は `spotId: string` だった ── つまり「地図の地点である」と決め打ちしていた。
   *   そのせいで旅程は地図を import しないと名前も出せず、**地図が無いと成り立たない
   *   部品**になっていた。型も一緒に持てば、持ち主が誰であっても
   *   `resolveObjectPlain(type, id, …)` で訊けるので、旅程は相手を知らなくてよい。
   * ★ 指であって子ではない（`state` が持つ子はインスタンス、という決まりの対象外）。
   */
  ref?: ObjectRef;
  /**
   * **この予定のもとになったもの**（メモの 1 行など）。
   *
   * ★ 外したときに「もとの 1 件が自由になった」と分かるようにするために要る
   *   ── 本計画づくりの場では、旅程に入っていないものだけが浮かぶので、
   *   これが無いと**外しても浮かんでこない**。
   * ★ 立ち寄り先（`ref`）とは別。あちらは「どこへ行くか」、こちらは「どこから来たか」。
   */
  from?: ObjectRef;
};

export type { ObjectRef };

export class ItineraryItem_予定 {
  constructor(readonly state: ItineraryItemPlain) {}

  get id(): string { return this.state.id; }
  get startMin(): number { return this.state.startMin; }
  get endMin(): number { return this.state.endMin; }
  get title(): string { return this.state.title; }
  get kind(): ItineraryKind_種類 { return this.state.kind; }
  get cost(): number { return this.state.cost; }
  get costNote(): string | undefined { return this.state.costNote; }
  get ref(): ObjectRef | undefined { return this.state.ref; }
  get from(): ObjectRef | undefined { return this.state.from; }

  /** 「08:30 - 10:05」 */
  get timeLabel(): string {
    return `${formatMin(this.state.startMin)} - ${formatMin(this.state.endMin)}`;
  }

  /** 金額の読み方。但し書きがあればそちらを出す */
  get costLabel(): string {
    if (this.state.costNote) return this.state.costNote;
    return this.state.cost === 0 ? "¥0" : `¥${this.state.cost.toLocaleString("ja-JP")}`;
  }

  withTitle(title: string): ItineraryItem_予定 {
    return new ItineraryItem_予定({ ...this.state, title });
  }

  withTime(startMin: number, endMin: number): ItineraryItem_予定 {
    return new ItineraryItem_予定({ ...this.state, startMin, endMin });
  }

  /**
   * **始まりを動かす。長さはそのまま** ── 予定ごと前後に動く。
   *
   * ★ 始まりと終わりで振る舞いを分けたのは、動かしたい理由が違うから。
   *   始まりを直すのは「もっと早く出る／遅く出る」で、そのとき中身の長さは変わらない。
   *   終わりを直すのは「もっと長く居る」で、そのとき長さが変わる。
   *   両方を同じ扱いにすると、出発を 30 分早めたいだけなのに滞在が 30 分延びる。
   */
  withStart(startMin: number): ItineraryItem_予定 {
    const start = clampToDay(startMin);
    const length = this.state.endMin - this.state.startMin;
    return new ItineraryItem_予定({
      ...this.state,
      startMin: start,
      endMin: clampToDay(start + length),
    });
  }

  /**
   * **終わりを動かす。長さが変わる。**
   * 始まりより前にはできない ── 前に置けてしまうと、読んだときに時刻が逆さまになる。
   */
  withEnd(endMin: number): ItineraryItem_予定 {
    return new ItineraryItem_予定({
      ...this.state,
      endMin: Math.max(this.state.startMin, clampToDay(endMin)),
    });
  }

  /** 種類を変える（行の左の色と、読み方が変わる） */
  withKind(kind: ItineraryKind_種類): ItineraryItem_予定 {
    return new ItineraryItem_予定({ ...this.state, kind });
  }

  /** 費用を変える。マイナスは受けない（返金は費用ではない） */
  withCost(cost: number): ItineraryItem_予定 {
    return new ItineraryItem_予定({ ...this.state, cost: Math.max(0, Math.round(cost)) });
  }

  /**
   * 費用の但し書きを変える（「宿泊費別」など）。
   *
   * ★ 空にしたら**但し書きそのものを落とす**。空の字を持っていると、
   *   「但し書きがある」と「無い」の区別が字の長さで決まってしまう。
   */
  withCostNote(costNote: string): ItineraryItem_予定 {
    const next = costNote.trim();
    const state = { ...this.state };
    if (next) state.costNote = next;
    else delete state.costNote;
    return new ItineraryItem_予定(state);
  }

  /** 立ち寄り先を指す／外す（`undefined` で外れる） */
  withRef(ref: ObjectRef | undefined): ItineraryItem_予定 {
    const state = { ...this.state };
    if (ref) state.ref = ref;
    else delete state.ref;
    return new ItineraryItem_予定(state);
  }

  toPlain(): ItineraryItemPlain { return { ...this.state }; }

  static fromPlain(plain: ItineraryItemPlain): ItineraryItem_予定 {
    return new ItineraryItem_予定(plain);
  }

  static kindLabel(kind: ItineraryKind_種類): string {
    const labels: Record<ItineraryKind_種類, string> = {
      move: "移動",
      meal: "食事",
      sightseeing: "観光",
      stay: "宿泊",
      other: "その他",
    };
    return labels[kind];
  }

  static kindColor(kind: ItineraryKind_種類): string {
    const colors: Record<ItineraryKind_種類, string> = {
      move: "#4a5568",
      meal: "#e06c2b",
      sightseeing: "#2f7fd6",
      stay: "#8a5cd6",
      other: "#6b7280",
    };
    return colors[kind];
  }
}

/**
 * その日の中に収める。
 *
 * ★ **日をまたぐ予定はまだ表せない。** またぐなら翌日の予定として置き直す、という
 *   決まりにしてある（`docs/bubly-composition.md` の 7 節）。
 *   ここで黙って翌日へ回すと、どの日の予定なのか集約と画面で食い違う。
 */
const clampToDay = (min: number): number => Math.max(0, Math.min(Math.round(min), 24 * 60 - 1));

/** 分を `HH:MM` にする */
export const formatMin = (min: number): string => {
  const clamped = Math.max(0, Math.min(min, 24 * 60 - 1));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** `HH:MM` を分にする（読めなければ undefined） */
export const parseMin = (text: string): number | undefined => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return undefined;
  return h * 60 + min;
};

export const ITINERARY_ITEM_SHAPE: SchemaShape = objectShape([
  { name: "id", shape: primitiveShape("string"), required: true, label: "ID" },
  { name: "startMin", shape: primitiveShape("number"), required: true, label: "開始（分）" },
  { name: "endMin", shape: primitiveShape("number"), required: true, label: "終了（分）" },
  { name: "title", shape: primitiveShape("string"), required: true, label: "内容", role: "title" },
  {
    name: "kind",
    shape: enumShape(["move", "meal", "sightseeing", "stay", "other"]),
    required: true,
    label: "種類",
  },
  { name: "cost", shape: primitiveShape("number"), required: true, label: "費用", role: "money" },
  { name: "costNote", shape: primitiveShape("string"), required: false, label: "費用の但し書き" },
  /**
   * ★ **役を名乗る**（`place`）。これで地図は、旅程を知らないまま
   *   「この中に立ち寄り先が並んでいる」と読める（`collectPlaces`）。
   */
  { name: "ref", shape: objectRefShape(), required: false, label: "立ち寄り先", role: "place" },
  { name: "from", shape: objectRefShape(), required: false, label: "もとになったもの" },
]);
