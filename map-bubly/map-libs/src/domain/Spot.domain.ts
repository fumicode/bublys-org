/**
 * **地点** ── 地図の上の 1 か所。「箱根神社」「芦ノ湖」のような場所そのもの。
 *
 * ★ **場所を持つのは地図だけ。** アクティビティも旅程の予定も、場所は `spotId` で
 *   指すだけにする。同じ「箱根神社」がバブリごとに別々に増えていくと、地図に出したとき
 *   ピンが二重になるうえ、名前を直しても片方しか直らない。
 */
import { arrayShape, enumShape, objectShape, primitiveShape, type SchemaShape } from "@bublys-org/domain-registry/schema";

/** 地点の種類。ピンの色と印はここで決まる */
export type SpotCategory_種類 = "sightseeing" | "food" | "lodging" | "station" | "port";

/** 保存形（Redux / JSON） */
export type SpotPlain = {
  id: string;
  name: string;
  category: SpotCategory_種類;
  /** 緯度 */
  lat: number;
  /** 経度 */
  lng: number;
  /**
   * **何をする所か。** 越後の一覧が持っている目印（温泉・入浴／スキー・スノーボード／酒蔵…）。
   *
   * ★ 種類（`category`）と分けてあるのは、**重なるから**。同じ所が温泉でもあり
   *   宿泊もできることがあり、どれか 1 つを選ばせると必ず嘘になる。
   *   種類はピンの色を決めるためだけの 5 つ、こちらは探すための目印。
   */
  tags?: string[];
  address?: string;
  /** どこの市町村か（探すときの絞り込み） */
  city?: string;
  /** 地方（越後では 下越・中越・上越） */
  region?: string;
  tel?: string;
  url?: string;
  /** 開いている時間など、出所に書いてあった一言 */
  note?: string;
  /**
   * **写真の URL の並び。** 中身の絵はここには持たない ── 貼った先が消えたら映らなくなる。
   *
   * ★ 自分のストレージには入れない決まり。Wikimedia などの安定した出所を貼る運用にしてある。
   */
  photoUrls?: string[];
};

export class Spot_地点 {
  constructor(readonly state: SpotPlain) {}

  get id(): string { return this.state.id; }
  get name(): string { return this.state.name; }
  get category(): SpotCategory_種類 { return this.state.category; }
  get lat(): number { return this.state.lat; }
  get lng(): number { return this.state.lng; }
  get tags(): string[] { return this.state.tags ?? []; }
  get address(): string | undefined { return this.state.address; }
  get city(): string | undefined { return this.state.city; }
  get region(): string | undefined { return this.state.region; }
  get tel(): string | undefined { return this.state.tel; }
  get url(): string | undefined { return this.state.url; }
  get note(): string | undefined { return this.state.note; }
  get photoUrls(): string[] { return this.state.photoUrls ?? []; }

  withName(name: string): Spot_地点 {
    return new Spot_地点({ ...this.state, name });
  }

  withPhotoUrls(photoUrls: string[]): Spot_地点 {
    return new Spot_地点({ ...this.state, photoUrls });
  }

  toPlain(): SpotPlain { return { ...this.state }; }

  static fromPlain(plain: SpotPlain): Spot_地点 {
    return new Spot_地点(plain);
  }

  static categoryLabel(category: SpotCategory_種類): string {
    const labels: Record<SpotCategory_種類, string> = {
      sightseeing: "観光",
      food: "飲食店",
      lodging: "宿泊",
      station: "駅",
      port: "港",
    };
    return labels[category];
  }

  /** ピンの色。地図の凡例もここから引く ── 色の決め方が 2 か所にあると必ずずれる */
  static categoryColor(category: SpotCategory_種類): string {
    const colors: Record<SpotCategory_種類, string> = {
      sightseeing: "#2f7fd6",
      food: "#e06c2b",
      lodging: "#8a5cd6",
      station: "#4a5568",
      port: "#0f8f86",
    };
    return colors[category];
  }
}

/**
 * 地点の形 ── ほかのバブリが「この型の中身は何か」を引くための申告。
 *
 * ★ **役を名乗る**（`role`）。項目の綴り（`name` / `lat` / `lng`）に頼らせないため
 *   ── 受け取る側が綴りを探しにいくと、別の型では黙って繋がらない。
 *   ここを名乗っておけば、地図は「緯度と経度を名乗っているもの」としてこれを描けるし、
 *   旅程は「題名を名乗っているもの」として名前を出せる。
 */
export const SPOT_SHAPE: SchemaShape = objectShape([
  { name: "id", shape: primitiveShape("string"), required: true, label: "ID" },
  { name: "name", shape: primitiveShape("string"), required: true, label: "名前", role: "title" },
  {
    name: "category",
    shape: enumShape(["sightseeing", "food", "lodging", "station", "port"]),
    required: true,
    label: "種類",
  },
  { name: "lat", shape: primitiveShape("number"), required: true, label: "緯度", role: "latitude" },
  { name: "lng", shape: primitiveShape("number"), required: true, label: "経度", role: "longitude" },
  /**
   * ★ 住所も名乗る（役 `address`）── 受け取った側が地図を持っていなくても、
   *   どこの話かを字で出せる。
   */
  { name: "address", required: false, shape: primitiveShape("string"), label: "住所", role: "address" },
  { name: "city", required: false, shape: primitiveShape("string"), label: "市町村" },
  { name: "region", required: false, shape: primitiveShape("string"), label: "地方" },
  { name: "tel", required: false, shape: primitiveShape("string"), label: "電話" },
  { name: "url", required: false, shape: primitiveShape("string"), label: "ウェブ" },
  { name: "note", required: false, shape: primitiveShape("string"), label: "ひとこと" },
  { name: "photoUrls", required: false, shape: arrayShape(primitiveShape("string")), label: "写真" },
]);
