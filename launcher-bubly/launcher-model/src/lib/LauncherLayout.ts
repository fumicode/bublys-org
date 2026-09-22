/**
 * ランチャーの並べ方。
 *
 * 規則はひとつ ──
 *   **ラベル付きで縦に全部並ぶなら、そう並べる。
 *     無理ならアイコンだけにして、縦と横で「多く入る方」に並べる。**
 *
 * ここから次のことが自然と出る（場合分けを書かなくてよい）:
 *   - 縦に並んでいて横幅が足りない（ラベルが書けない） → アイコン表示
 *   - 高さが足りない（全部入らない）                   → アイコン表示になり、
 *     横の方が多く入るなら横並びになる
 *   - 細長く縦に長い箱なら、アイコンでも縦のまま
 *
 * 箱の大きさだけで決まるので、岸に貼っていても海に浮いていても同じ。
 */

/** 描くのに必要な寸法（px）。UI 側の実寸と合わせる */
export type LauncherMetrics = {
  /** ラベル付き 1 項目の高さ */
  readonly rowHeight: number;
  /** ラベルを読める形で出すのに要る幅 */
  readonly labeledWidth: number;
  /** アイコンだけの 1 項目の一辺 */
  readonly iconSize: number;
};

export const DEFAULT_LAUNCHER_METRICS: LauncherMetrics = {
  rowHeight: 44,
  labeledWidth: 160,
  iconSize: 44,
};

export type LauncherDirection = "vertical" | "horizontal";

export type LauncherLayout = {
  readonly direction: LauncherDirection;
  /** ラベルを出すか。false ならアイコンだけ */
  readonly labels: boolean;
};

/** 1 辺に何個入るか */
const capacity = (length: number, item: number): number =>
  item > 0 ? Math.floor(length / item) : 0;

/**
 * 箱の大きさと項目数から並べ方を決める。
 *
 * @param box   中身を描ける領域（px）
 * @param items 並べる項目の数（末尾の設定 ⚙ も 1 つと数える）
 */
export const launcherLayout = (
  box: { width: number; height: number },
  items: number,
  metrics: LauncherMetrics = DEFAULT_LAUNCHER_METRICS,
): LauncherLayout => {
  // ラベル付きで縦に「全部」並ぶか。幅が足りないか、高さに入り切らなければ諦める
  const labeledFits =
    box.width >= metrics.labeledWidth && items * metrics.rowHeight <= box.height;
  if (labeledFits) return { direction: "vertical", labels: true };

  // アイコンだけなら、多く見せられる向きに並べる（同じなら縦）
  const down = capacity(box.height, metrics.iconSize);
  const across = capacity(box.width, metrics.iconSize);
  return { direction: down >= across ? "vertical" : "horizontal", labels: false };
};
