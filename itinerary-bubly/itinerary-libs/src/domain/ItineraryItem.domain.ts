/**
 * **予定** ── 旅程の 1 行。「何時から何時まで、何をするか」。
 *
 * ★ 時刻は**その日の 0 時からの分**で持つ。「08:30」の文字列で持つと、
 *   終わりの時刻を出すたびに文字列を切って足して詰め直すことになる
 *   ── アクティビティを落として「所要時間ぶん後ろ」を出すのが旅程の主な仕事なので、
 *   足し算ができる形にしておく。読む形（`08:30`）は出すときに作る。
 * ★ 場所も中身も持たない ── 地点は `spotId`、アクティビティは `activityId` で指すだけ。
 */
import { enumShape, objectShape, primitiveShape, type SchemaShape } from "@bublys-org/domain-registry/schema";

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
  /** 立ち寄る地点（地図の `Spot`） */
  spotId?: string;
  /** もとになったアクティビティ */
  activityId?: string;
};

export class ItineraryItem_予定 {
  constructor(readonly state: ItineraryItemPlain) {}

  get id(): string { return this.state.id; }
  get startMin(): number { return this.state.startMin; }
  get endMin(): number { return this.state.endMin; }
  get title(): string { return this.state.title; }
  get kind(): ItineraryKind_種類 { return this.state.kind; }
  get cost(): number { return this.state.cost; }
  get costNote(): string | undefined { return this.state.costNote; }
  get spotId(): string | undefined { return this.state.spotId; }
  get activityId(): string | undefined { return this.state.activityId; }

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
  { name: "title", shape: primitiveShape("string"), required: true, label: "内容" },
  {
    name: "kind",
    shape: enumShape(["move", "meal", "sightseeing", "stay", "other"]),
    required: true,
    label: "種類",
  },
  { name: "cost", shape: primitiveShape("number"), required: true, label: "費用" },
  { name: "costNote", shape: primitiveShape("string"), required: false, label: "費用の但し書き" },
  { name: "spotId", shape: primitiveShape("string"), required: false, label: "地点 ID" },
  { name: "activityId", shape: primitiveShape("string"), required: false, label: "アクティビティ ID" },
]);
