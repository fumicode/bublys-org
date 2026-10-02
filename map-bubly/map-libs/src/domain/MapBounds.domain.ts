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

  /**
   * **渡された場所がぜんぶ映る範囲**を作る。
   *
   * > 渡されたものは、見えなければ渡されていないのと同じ。
   *
   * ★ 外から渡されたピンが画面の外にあると、地図は何も変わっていないように見える
   *   ── 落とした人は「効かなかった」と読む。だから落ちた先に合わせて寄る。
   * ★ **少し広げて囲む**（`margin`）。ぴったりに囲むと、端のピンが縁に貼り付いて
   *   名前が切れる。1 点だけのときは広がりが 0 になるので、そこは決め打ちで広げる。
   * ★ 1 つも渡されていなければ `undefined` ── 動かす理由が無いので動かさない。
   */
  static covering(
    places: readonly { readonly lat: number; readonly lng: number }[],
    /** 1 点だけのときに取る広さ（度）。約 2km */
    spot = 0.02,
    /** 周りに足す余白（広がりに対する割合） */
    margin = 0.15,
  ): MapBounds_範囲 | undefined {
    if (places.length === 0) return undefined;
    let south = places[0].lat, north = places[0].lat;
    let west = places[0].lng, east = places[0].lng;
    for (const p of places) {
      if (p.lat < south) south = p.lat;
      if (p.lat > north) north = p.lat;
      if (p.lng < west) west = p.lng;
      if (p.lng > east) east = p.lng;
    }
    const latPad = Math.max((north - south) * margin, spot / 2);
    const lngPad = Math.max((east - west) * margin, spot / 2);
    return new MapBounds_範囲({
      south: south - latPad,
      north: north + latPad,
      west: west - lngPad,
      east: east + lngPad,
    });
  }

  static fromPlain(plain: MapBoundsPlain): MapBounds_範囲 {
    return new MapBounds_範囲(plain);
  }

}

/** 最初に映す範囲 ── 越後妻有（十日町・松代・松之山・津南）がひと目に入るところ */
export const ECHIGO_TSUMARI_BOUNDS: MapBoundsPlain = {
  south: 36.98,
  north: 37.22,
  west: 138.55,
  east: 138.90,
};
