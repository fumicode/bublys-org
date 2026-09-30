/**
 * **地図が映している範囲** ── 南北と東西の端。
 *
 * ★ 「中心と倍率」ではなく**四隅**で持つ。ここに残っている仕事は結局
 *   「この中に入っているか」（＝この地図で探す）だけなので、その問いに直接答えられる形にする。
 * ★ **寄る・動かす・画面の位置へ写す、は持たない。** そこは Leaflet の仕事になった
 *   （`MapView`）。同じ計算を 2 か所に置くと、ピンが地の絵からずれる
 *   ── こちらは平らに割るだけ、Leaflet はメルカトル、と答えが違うため。
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

}

/** 最初に映す範囲 ── 箱根がひと目に入るところ */
export const HAKONE_BOUNDS: MapBoundsPlain = {
  south: 35.19,
  north: 35.256,
  west: 139.0,
  east: 139.116,
};
