/**
 * **地図が映している範囲** ── 南北と東西の端。
 *
 * ★ 「中心と倍率」ではなく**四隅**で持つ。地図でやりたいことは結局
 *   「この中に入っているか」（＝この地図で探す）なので、その問いに直接答えられる形にする。
 *   中心と倍率で持つと、問うたびに端を計算し直すことになり、計算の仕方が
 *   描く側と探す側の 2 か所に増える。
 */

export type MapBoundsPlain = {
  /** 南の端（緯度の小さいほう） */
  south: number;
  /** 北の端（緯度の大きいほう） */
  north: number;
  /** 西の端（経度の小さいほう） */
  west: number;
  /** 東の端（経度の大きいほう） */
  east: number;
};

/** 画面の中の位置（px） */
export type ScreenPoint = { x: number; y: number };

export class MapBounds_範囲 {
  constructor(readonly state: MapBoundsPlain) {}

  get south(): number { return this.state.south; }
  get north(): number { return this.state.north; }
  get west(): number { return this.state.west; }
  get east(): number { return this.state.east; }

  get latSpan(): number { return this.state.north - this.state.south; }
  get lngSpan(): number { return this.state.east - this.state.west; }
  get centerLat(): number { return (this.state.north + this.state.south) / 2; }
  get centerLng(): number { return (this.state.east + this.state.west) / 2; }

  /** この範囲の中に居るか ── 「この地図で探す」が使う唯一の問い */
  contains(lat: number, lng: number): boolean {
    return (
      lat >= this.state.south &&
      lat <= this.state.north &&
      lng >= this.state.west &&
      lng <= this.state.east
    );
  }

  /**
   * 緯度経度を、この大きさの絵の中の位置へ移す。
   * 北が上、東が右。地図の絵もピンも同じこの 1 本を通す ── 通さないとピンが湖からずれる。
   */
  project(lat: number, lng: number, width: number, height: number): ScreenPoint {
    return {
      x: ((lng - this.state.west) / this.lngSpan) * width,
      y: ((this.state.north - lat) / this.latSpan) * height,
    };
  }

  /**
   * 倍率を変える（中心はそのまま）。`factor` が 1 より小さいほど寄る。
   * 寄りすぎ・引きすぎで範囲が潰れたり地球を一周したりしないよう、端で止める。
   */
  zoomed(factor: number): MapBounds_範囲 {
    const nextLat = clamp(this.latSpan * factor, MIN_LAT_SPAN, MAX_LAT_SPAN);
    const nextLng = clamp(this.lngSpan * factor, MIN_LAT_SPAN, MAX_LAT_SPAN * 2);
    return MapBounds_範囲.fromCenter(this.centerLat, this.centerLng, nextLat, nextLng);
  }

  /** 平行移動（大きさはそのまま） */
  panned(dLat: number, dLng: number): MapBounds_範囲 {
    return new MapBounds_範囲({
      south: this.state.south + dLat,
      north: this.state.north + dLat,
      west: this.state.west + dLng,
      east: this.state.east + dLng,
    });
  }

  /** 同じ範囲か（絞り込みの結果が変わらないのに作り直さないため） */
  equals(other: MapBounds_範囲): boolean {
    return (
      this.state.south === other.state.south &&
      this.state.north === other.state.north &&
      this.state.west === other.state.west &&
      this.state.east === other.state.east
    );
  }

  toPlain(): MapBoundsPlain { return { ...this.state }; }

  static fromPlain(plain: MapBoundsPlain): MapBounds_範囲 {
    return new MapBounds_範囲(plain);
  }

  static fromCenter(lat: number, lng: number, latSpan: number, lngSpan: number): MapBounds_範囲 {
    return new MapBounds_範囲({
      south: lat - latSpan / 2,
      north: lat + latSpan / 2,
      west: lng - lngSpan / 2,
      east: lng + lngSpan / 2,
    });
  }
}

/** 寄れる限界・引ける限界（度）。だいたい 200m 四方 〜 40km 四方 */
const MIN_LAT_SPAN = 0.002;
const MAX_LAT_SPAN = 0.4;

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

/** 最初に映す範囲 ── 箱根がひと目に入るところ */
export const HAKONE_BOUNDS: MapBoundsPlain = {
  south: 35.19,
  north: 35.256,
  west: 139.0,
  east: 139.116,
};
