/**
 * **旅程** ── 日ごとの予定の集まり。この空間の集約。
 *
 * ★ **子はインスタンスで持つ**（CLAUDE.md 規則 2）。`state.days` は `ItineraryDay_日[]`
 *   であって、`ItineraryDayPlain[]` ではない。保存形は下に別に定義して、
 *   `toPlain()` / `fromPlain()` の 1 か所でだけ行き来する。
 * ★ 予定を足す・外す・時刻を変えるのは**全部ここ**。スライスは置くだけ（規則 6）。
 */
import { objectShape, primitiveShape, arrayShape, type SchemaShape } from "@bublys-org/domain-registry/schema";
import {
  ITINERARY_ITEM_SHAPE,
  ItineraryItem_予定,
  type ItineraryItemPlain,
  type ItineraryKind_種類,
  type ObjectRef,
} from "./ItineraryItem.domain.js";

// ========== 保存形（シリアライズ用。ドメインの形とは別） ==========

export type ItineraryDayPlain = {
  /** `2026-05-17` */
  date: string;
  items: ItineraryItemPlain[];
};

export type ItineraryPlain = {
  id: string;
  title: string;
  days: ItineraryDayPlain[];
};

// ========== ドメイン ==========

/** 1 日ぶん。予定は**必ず始まりの早い順**に並んでいる */
export class ItineraryDay_日 {
  constructor(readonly state: { date: string; items: ItineraryItem_予定[] }) {}

  get date(): string { return this.state.date; }
  get items(): readonly ItineraryItem_予定[] { return this.state.items; }

  /** その日の合計（但し書きのあるものは足さない ── 別勘定なので） */
  get totalCost(): number {
    return this.state.items.reduce((sum, i) => sum + (i.costNote ? 0 : i.cost), 0);
  }

  /** いちばん遅い終わりの時刻。1 つも無ければ `undefined` */
  get lastEndMin(): number | undefined {
    if (this.state.items.length === 0) return undefined;
    return Math.max(...this.state.items.map((i) => i.endMin));
  }

  /** その日に立ち寄る先の並び（時刻の順）。地図へ道として渡すのに使う */
  get refs(): ObjectRef[] {
    return this.state.items
      .map((i) => i.ref)
      .filter((r): r is ObjectRef => r !== undefined);
  }

  withItem(item: ItineraryItem_予定): ItineraryDay_日 {
    return new ItineraryDay_日({
      ...this.state,
      items: sorted([...this.state.items, item]),
    });
  }

  withoutItem(itemId: string): ItineraryDay_日 {
    return new ItineraryDay_日({
      ...this.state,
      items: this.state.items.filter((i) => i.id !== itemId),
    });
  }

  withReplacedItem(item: ItineraryItem_予定): ItineraryDay_日 {
    return new ItineraryDay_日({
      ...this.state,
      items: sorted(this.state.items.map((i) => (i.id === item.id ? item : i))),
    });
  }

  toPlain(): ItineraryDayPlain {
    return { date: this.state.date, items: this.state.items.map((i) => i.toPlain()) };
  }

  static fromPlain(plain: ItineraryDayPlain): ItineraryDay_日 {
    return new ItineraryDay_日({
      date: plain.date,
      items: sorted(plain.items.map(ItineraryItem_予定.fromPlain)),
    });
  }
}

/** 落としたものを継ぐときの既定の始まり（9:00）── その日がまだ空のとき */
const DEFAULT_START_MIN = 9 * 60;
/** 予定と予定のあいだに空ける時間（分） */
const GAP_MIN = 15;

export class Itinerary_旅程 {
  constructor(readonly state: { id: string; title: string; days: ItineraryDay_日[] }) {}

  get id(): string { return this.state.id; }
  get title(): string { return this.state.title; }
  get days(): readonly ItineraryDay_日[] { return this.state.days; }
  get dates(): string[] { return this.state.days.map((d) => d.date); }

  day(date: string): ItineraryDay_日 | undefined {
    return this.state.days.find((d) => d.date === date);
  }

  /** 旅程ぜんぶの合計 */
  get totalCost(): number {
    return this.state.days.reduce((sum, d) => sum + d.totalCost, 0);
  }

  findItem(itemId: string): ItineraryItem_予定 | undefined {
    for (const d of this.state.days) {
      const hit = d.items.find((i) => i.id === itemId);
      if (hit) return hit;
    }
    return undefined;
  }

  withTitle(title: string): Itinerary_旅程 {
    return new Itinerary_旅程({ ...this.state, title });
  }

  /** その日を入れ替える（無い日なら新しく足す） */
  private withDay(day: ItineraryDay_日): Itinerary_旅程 {
    const exists = this.state.days.some((d) => d.date === day.date);
    const days = exists
      ? this.state.days.map((d) => (d.date === day.date ? day : d))
      : [...this.state.days, day].sort((a, b) => a.date.localeCompare(b.date));
    return new Itinerary_旅程({ ...this.state, days });
  }

  /**
   * **落としたものを、その日の最後に継ぐ。**
   *
   * > 何時からにするかは聞かない。**最後の予定の後ろに、すこし間を空けて置く。**
   *
   * ★ 落とした人に時刻を聞かないのは、掴んで落とすという操作に「答える」場所が無いから。
   *   置いてから直すほうが手数が少ない（時刻は行の上で直せる）。
   * ★ その日がまだ空なら 9:00 から。
   */
  appended(
    date: string,
    spec: {
      title: string;
      durationMin: number;
      kind: ItineraryKind_種類;
      cost?: number;
      ref?: ObjectRef;
      id?: string;
    },
  ): Itinerary_旅程 {
    const day = this.day(date) ?? new ItineraryDay_日({ date, items: [] });
    const last = day.lastEndMin;
    const startMin = last === undefined ? DEFAULT_START_MIN : last + GAP_MIN;
    const item = new ItineraryItem_予定({
      id: spec.id ?? crypto.randomUUID(),
      startMin,
      endMin: startMin + spec.durationMin,
      title: spec.title,
      kind: spec.kind,
      cost: spec.cost ?? 0,
      ref: spec.ref,
    });
    return this.withDay(day.withItem(item));
  }

  /** 予定を外す */
  withoutItem(itemId: string): Itinerary_旅程 {
    return new Itinerary_旅程({
      ...this.state,
      days: this.state.days.map((d) => d.withoutItem(itemId)),
    });
  }

  /** 予定を置き換える（時刻や内容を直したとき） */
  withItem(item: ItineraryItem_予定): Itinerary_旅程 {
    return new Itinerary_旅程({
      ...this.state,
      days: this.state.days.map((d) =>
        d.items.some((i) => i.id === item.id) ? d.withReplacedItem(item) : d,
      ),
    });
  }

  toPlain(): ItineraryPlain {
    return {
      id: this.state.id,
      title: this.state.title,
      days: this.state.days.map((d) => d.toPlain()),
    };
  }

  static fromPlain(plain: ItineraryPlain): Itinerary_旅程 {
    return new Itinerary_旅程({
      id: plain.id,
      title: plain.title,
      days: plain.days.map(ItineraryDay_日.fromPlain),
    });
  }
}

/** 始まりの早い順。同じなら終わりの早い順 */
const sorted = (items: ItineraryItem_予定[]): ItineraryItem_予定[] =>
  [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

export const ITINERARY_SHAPE: SchemaShape = objectShape([
  { name: "id", shape: primitiveShape("string"), required: true, label: "ID" },
  { name: "title", shape: primitiveShape("string"), required: true, label: "題名" },
  {
    name: "days",
    shape: arrayShape(
      objectShape([
        { name: "date", shape: primitiveShape("string"), required: true, label: "日付" },
        { name: "items", shape: arrayShape(ITINERARY_ITEM_SHAPE), required: true, label: "予定" },
      ]),
    ),
    required: true,
    label: "日ごとの予定",
  },
]);
