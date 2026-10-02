/**
 * **宿** ── 泊まれる所 1 軒。
 *
 * ★ **地点とは別のもの。** 地図の地点（`Spot`）は「地図の上の 1 か所」で、
 *   こちらは「泊まれる所」。同じ場所を指していても言いたいことが違うので、
 *   片方をもう片方で兼ねると、どちらの都合も歪む
 *   ── 地点に「素泊まりいくら」は要らないし、宿に「港」は無い。
 * ★ ただし**場所は名乗る**（役 `latitude` / `longitude` / `address`）。
 *   そうしておけば、地図は宿が何であるかを知らないまま描けるし、
 *   旅程も「題名を名乗るもの」として受け取れる。
 * ★ 状態は `state` を通して持ち、直すときは新しいインスタンスを返す。
 */
import { objectShape, primitiveShape, type SchemaShape } from "@bublys-org/domain-registry/schema";

/** 保存形（Redux / JSON） */
export type LodgingPlain = {
  id: string;
  name: string;
  /**
   * どういう宿か（ホテル・旅館・民宿・ペンション・ロッジ…）。
   *
   * ★ **決まった一覧にしない。** 出所によって呼び方が違い（「旅館・宿」「ゲストハウス/民宿」）、
   *   こちらで 5 つに丸めると、探すときに元の言葉で当たらなくなる。
   */
  kind?: string;
  lat: number;
  lng: number;
  address?: string;
  tel?: string;
  /** エリア・温泉地（越後では「越後湯沢」「赤倉温泉」など） */
  area?: string;
  city?: string;
  /** 地方（越後では 下越・中越・上越） */
  region?: string;
};

export class Lodging_宿 {
  constructor(readonly state: LodgingPlain) {}

  get id(): string { return this.state.id; }
  get name(): string { return this.state.name; }
  get kind(): string | undefined { return this.state.kind; }
  get lat(): number { return this.state.lat; }
  get lng(): number { return this.state.lng; }
  get address(): string | undefined { return this.state.address; }
  get tel(): string | undefined { return this.state.tel; }
  get area(): string | undefined { return this.state.area; }
  get city(): string | undefined { return this.state.city; }
  get region(): string | undefined { return this.state.region; }

  /**
   * 札に 1 行で出す居場所。**エリアがあればそちら**
   * ── 「越後湯沢」のほうが「南魚沢郡湯沢町」より、どこの話かが伝わる。
   */
  get placeLabel(): string {
    return this.state.area || this.state.city || this.state.address || "";
  }

  withName(name: string): Lodging_宿 {
    return new Lodging_宿({ ...this.state, name });
  }

  toPlain(): LodgingPlain { return { ...this.state }; }

  static fromPlain(plain: LodgingPlain): Lodging_宿 {
    return new Lodging_宿(plain);
  }
}

/**
 * 宿の形 ── ほかのバブリが「この型の中身は何か」を引くための申告。
 *
 * ★ **役を名乗る**（`role`）。項目の綴りに頼らせないため ── 名乗っておけば、
 *   地図は「緯度と経度を名乗っているもの」としてこれを描けるし、
 *   旅程は「題名を名乗っているもの」として名前を出せる。宿を知らないまま。
 */
export const LODGING_SHAPE: SchemaShape = objectShape([
  { name: "id", shape: primitiveShape("string"), required: true, label: "ID" },
  { name: "name", shape: primitiveShape("string"), required: true, label: "名前", role: "title" },
  { name: "kind", shape: primitiveShape("string"), required: false, label: "区分" },
  { name: "lat", shape: primitiveShape("number"), required: true, label: "緯度", role: "latitude" },
  { name: "lng", shape: primitiveShape("number"), required: true, label: "経度", role: "longitude" },
  { name: "address", shape: primitiveShape("string"), required: false, label: "住所", role: "address" },
  { name: "tel", shape: primitiveShape("string"), required: false, label: "電話" },
  { name: "area", shape: primitiveShape("string"), required: false, label: "エリア" },
  { name: "city", shape: primitiveShape("string"), required: false, label: "市町村" },
  { name: "region", shape: primitiveShape("string"), required: false, label: "地方" },
]);
