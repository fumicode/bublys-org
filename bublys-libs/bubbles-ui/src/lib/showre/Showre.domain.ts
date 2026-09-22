/**
 * 岸（Showre = shore + show）。
 *
 * ルール: 「バブルは浮いているか、岸に着いているかのどちらか。岸に着いたバブルは帯になる。
 *          岸はユニバースごとに 4 つある。」
 *
 * 岸に着いたバブルは奥行き（process.layers）を持たない。かわりに、どの辺の何番目に
 * 居るかだけを持つ。岸の並びは配置（BubbleArrangement）の一部なので世界線に入る。
 */

export type ShowreSide = "top" | "bottom" | "left" | "right";

export const SHOWRE_SIDES: readonly ShowreSide[] = ["top", "bottom", "left", "right"];

export const isShowreSide = (v: unknown): v is ShowreSide =>
  typeof v === "string" && (SHOWRE_SIDES as readonly string[]).includes(v);

/** left / right は縦長の帯、top / bottom は横長の帯 */
export const isVerticalShowre = (side: ShowreSide): boolean =>
  side === "left" || side === "right";

/**
 * 各辺に着いているバブル ID の並び（配列の順 = 帯の並び順）と、
 * 岸が使われ始めた順（`order`）。
 *
 * `order` はルール「先に貼った岸が角を取る」のためのもの。先に使われ始めた岸ほど
 * 外側に置かれ、四隅を取る。誰も居なくなった岸は order から抜ける。
 */
export type ShowresState = Record<ShowreSide, string[]> & {
  order: ShowreSide[];
};

export const emptyShowresState = (): ShowresState => ({
  top: [],
  bottom: [],
  left: [],
  right: [],
  order: [],
});

/**
 * 点 (x, y) から見て一番近い辺。同距離なら左・右を優先する
 * （画面は横長が普通で、左右の方が縦の余白を奪わないため）。
 */
export const nearestShowreSide = (
  point: { x: number; y: number },
  size: { width: number; height: number },
): ShowreSide => {
  const distances: Record<ShowreSide, number> = {
    left: point.x,
    right: size.width - point.x,
    top: point.y,
    bottom: size.height - point.y,
  };
  // 優先順に並べて reduce すれば、同距離のとき先に出た方（left / right）が残る
  return (["left", "right", "top", "bottom"] as const).reduce((best, side) =>
    distances[side] < distances[best] ? side : best,
  );
};

export class Showres {
  constructor(readonly state: ShowresState) {}

  static empty(): Showres {
    return new Showres(emptyShowresState());
  }

  static fromJSON(json: Partial<ShowresState> | undefined | null): Showres {
    const empty = emptyShowresState();
    if (!json) return new Showres(empty);
    const sides = {
      top: [...(json.top ?? empty.top)],
      bottom: [...(json.bottom ?? empty.bottom)],
      left: [...(json.left ?? empty.left)],
      right: [...(json.right ?? empty.right)],
    };
    return new Showres({ ...sides, order: normalizeOrder(json.order, sides) });
  }

  toJSON(): ShowresState {
    return this.state;
  }

  /** その辺に着いているバブル ID の並び */
  on(side: ShowreSide): readonly string[] {
    return this.state[side];
  }

  /** バブルがどの岸に居るか。浮いていれば undefined */
  sideOf(bubbleId: string): ShowreSide | undefined {
    return SHOWRE_SIDES.find((side) => this.state[side].includes(bubbleId));
  }

  /** 岸に居るすべてのバブル ID */
  get allIds(): string[] {
    return SHOWRE_SIDES.flatMap((side) => this.state[side]);
  }

  /**
   * 岸が使われ始めた順（外側 → 内側）。誰かが居る岸だけ。
   * 先に貼った岸ほど外側で、角を取る。
   */
  get order(): readonly ShowreSide[] {
    return this.state.order;
  }

  /**
   * 着岸。既にどこかの岸に居れば外してから着ける。
   * index を省略すると末尾。範囲外は端に丸める。
   */
  dock(bubbleId: string, side: ShowreSide, index?: number): Showres {
    const removed = this.undock(bubbleId);
    const list = [...removed.state[side]];
    const at = index === undefined ? list.length : Math.max(0, Math.min(index, list.length));
    list.splice(at, 0, bubbleId);
    const sides = { ...removed.state, [side]: list };
    return new Showres({ ...sides, order: normalizeOrder(removed.state.order, sides) });
  }

  /** 引き剥がし。居なければそのまま */
  undock(bubbleId: string): Showres {
    if (this.sideOf(bubbleId) === undefined) return this;
    const sides = emptyShowresState();
    for (const side of SHOWRE_SIDES) {
      sides[side] = this.state[side].filter((id) => id !== bubbleId);
    }
    return new Showres({ ...sides, order: normalizeOrder(this.state.order, sides) });
  }

  /** 辺の移動・辺内の並び替え。dock と同じ（岸に居なければ着岸になる） */
  move(bubbleId: string, side: ShowreSide, index: number): Showres {
    return this.dock(bubbleId, side, index);
  }
}

/**
 * order を「誰かが居る岸だけ・重複なし・使われ始めた順」に整える。
 * 既存の order は残し、order に無いのに誰かが居る岸は末尾に足す
 * （古い保存形式に order が無い場合は、辺の既定順で補う）。
 */
const normalizeOrder = (
  order: readonly ShowreSide[] | undefined,
  sides: Record<ShowreSide, string[]>,
): ShowreSide[] => {
  const result: ShowreSide[] = [];
  for (const side of [...(order ?? []), ...SHOWRE_SIDES]) {
    if (sides[side].length > 0 && !result.includes(side)) result.push(side);
  }
  return result;
};
