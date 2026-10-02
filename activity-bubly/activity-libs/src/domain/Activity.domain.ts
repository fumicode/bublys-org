/**
 * **アクティビティ** ── 出かけた先でできること 1 つ。遊覧船、美術館、散策。
 *
 * ★ **場所は持たない。指すだけ**（`place`）。名前と緯度経度をここにも写して持つと、
 *   相手で直しても片方だけ古いまま残る。
 * ★ 指は**型と id の組**。id だけだと、使う側が「たぶん地点だろう」と決め打ちすることになる
 *   ── それでは地点以外の場所（宿、駅、人が作った目印）に開かれない。
 * ★ 所要時間を持つのは、**旅程がこれを受け取ったときに終わりの時刻を出せる**ようにするため。
 *   旅程の側で「たぶん 1 時間」と決め打ちにすると、アクティビティを直しても旅程は変わらない。
 */
import {
  objectRefShape,
  objectShape,
  primitiveShape,
  type SchemaShape,
} from "@bublys-org/domain-registry/schema";
import type { ObjectRef } from "@bublys-org/bubbles-ui";

export type ActivityPlain = {
  id: string;
  name: string;
  /** 開催場所への指（型と id）。誰の場所でもよい */
  place?: ObjectRef;
  /** 所要時間（分） */
  durationMin: number;
  /** 料金（円。0 なら無料） */
  price: number;
  /** 評価（5 点満点） */
  rating: number;
  /** 口コミの件数 */
  reviewCount: number;
  description: string;
};

export class Activity_アクティビティ {
  constructor(readonly state: ActivityPlain) {}

  get id(): string { return this.state.id; }
  get name(): string { return this.state.name; }
  get place(): ObjectRef | undefined { return this.state.place; }
  get durationMin(): number { return this.state.durationMin; }
  get price(): number { return this.state.price; }
  get rating(): number { return this.state.rating; }
  get reviewCount(): number { return this.state.reviewCount; }
  get description(): string { return this.state.description; }

  /** 「60分」「1時間30分」のような読み方 */
  get durationLabel(): string {
    const h = Math.floor(this.state.durationMin / 60);
    const m = this.state.durationMin % 60;
    if (h === 0) return `${m}分`;
    return m === 0 ? `${h}時間` : `${h}時間${m}分`;
  }

  /** 「¥1,500」「無料」 */
  get priceLabel(): string {
    return this.state.price === 0 ? "無料" : `¥${this.state.price.toLocaleString("ja-JP")}`;
  }

  withName(name: string): Activity_アクティビティ {
    return new Activity_アクティビティ({ ...this.state, name });
  }

  withDescription(description: string): Activity_アクティビティ {
    return new Activity_アクティビティ({ ...this.state, description });
  }

  toPlain(): ActivityPlain { return { ...this.state }; }

  static fromPlain(plain: ActivityPlain): Activity_アクティビティ {
    return new Activity_アクティビティ(plain);
  }
}

/**
 * アクティビティの形 ── ほかのバブリが中身を引くための申告。
 *
 * ★ **役を名乗る**。これだけで旅程に落とせるようになる ── 旅程は
 *   `Activity` という名前を知らないまま、「時間と金額と場所を名乗っているもの」
 *   として予定にする。
 */
export const ACTIVITY_SHAPE: SchemaShape = objectShape([
  { name: "id", shape: primitiveShape("string"), required: true, label: "ID" },
  { name: "name", shape: primitiveShape("string"), required: true, label: "名前", role: "title" },
  { name: "place", shape: objectRefShape(), required: false, label: "開催場所", role: "place" },
  { name: "durationMin", shape: primitiveShape("number"), required: true, label: "所要時間（分）", role: "duration" },
  { name: "price", shape: primitiveShape("number"), required: true, label: "料金", role: "money" },
  { name: "rating", shape: primitiveShape("number"), required: true, label: "評価" },
  { name: "reviewCount", shape: primitiveShape("number"), required: true, label: "口コミ件数" },
  { name: "description", shape: primitiveShape("string"), required: true, label: "説明" },
]);
