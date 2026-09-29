/**
 * **アクティビティ** ── 出かけた先でできること 1 つ。遊覧船、美術館、散策。
 *
 * ★ **場所は持たない。`spotId` で地図の地点を指すだけ**（地図バブリの `Spot_地点`）。
 *   名前と緯度経度をここにも持つと、地図で直しても片方だけ古いまま残る。
 * ★ 所要時間を持つのは、**旅程がこれを受け取ったときに終わりの時刻を出せる**ようにするため。
 *   旅程の側で「たぶん 1 時間」と決め打ちにすると、アクティビティを直しても旅程は変わらない。
 */
import { objectShape, primitiveShape, type SchemaShape } from "@bublys-org/domain-registry/schema";

export type ActivityPlain = {
  id: string;
  name: string;
  /** 地図の地点の ID（`spots/<spotId>` で開ける） */
  spotId: string;
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
  get spotId(): string { return this.state.spotId; }
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

/** アクティビティの形 ── ほかのバブリが中身を引くための申告 */
export const ACTIVITY_SHAPE: SchemaShape = objectShape([
  { name: "id", shape: primitiveShape("string"), required: true, label: "ID" },
  { name: "name", shape: primitiveShape("string"), required: true, label: "名前" },
  { name: "spotId", shape: primitiveShape("string"), required: true, label: "開催場所の地点 ID" },
  { name: "durationMin", shape: primitiveShape("number"), required: true, label: "所要時間（分）" },
  { name: "price", shape: primitiveShape("number"), required: true, label: "料金" },
  { name: "rating", shape: primitiveShape("number"), required: true, label: "評価" },
  { name: "reviewCount", shape: primitiveShape("number"), required: true, label: "口コミ件数" },
  { name: "description", shape: primitiveShape("string"), required: true, label: "説明" },
]);
