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
 * **入り切らないぶんはスクロールで見る。** 並べ方は変えない ── 箱が短いことと、
 * 中身が多いことは別の話で、短い箱に合わせて姿を落としても行き先の数は減らない。
 *
 * ただし**アイコン 2 つすら置けない箱**になったら、並べる意味がなくなる。
 * そのときだけ **1 つのアイコンにまとまる**（押すと、箱に縛られない所へ一覧が出る）。
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
  /** アイコンの周りの余白（一覧の縁と、アイコンどうしの間） */
  readonly iconMargin: number;
};

export const DEFAULT_LAUNCHER_METRICS: LauncherMetrics = {
  rowHeight: 44,
  labeledWidth: 160,
  iconSize: 44,
  iconMargin: 4,
};

export type LauncherDirection = "vertical" | "horizontal";

export type LauncherLayout = {
  readonly direction: LauncherDirection;
  /** ラベルを出すか。false ならアイコンだけ */
  readonly labels: boolean;
  /**
   * **1 つのアイコンにまとまるか。** 縦も横も「アイコン 2 つが余白つきで並ぶ大きさ」に
   * 届かないときだけ true ── そこまで小さいと、何を並べても 1 つしか見えない。
   *
   * ★ true のときの `direction` / `labels` は使わない。浮かぶ一覧は箱に縛られないので、
   *   その並べ方は出す側が決める。
   */
  readonly collapsed: boolean;
};

/** アイコン 2 つが余白つきで並ぶ大きさ ── これを下回った辺は「並べられない」 */
export const twoIcons = (m: LauncherMetrics = DEFAULT_LAUNCHER_METRICS): number =>
  2 * m.iconSize + 2 * m.iconMargin;

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
  // 縦も横もアイコン 2 つに届かない ── 並べる所が無いので 1 つにまとまる
  const min = twoIcons(metrics);
  if (box.width < min && box.height < min) {
    return { direction: "vertical", labels: false, collapsed: true };
  }

  const labeledFits =
    box.width >= metrics.labeledWidth && items * metrics.rowHeight <= box.height;
  if (labeledFits) return { direction: "vertical", labels: true, collapsed: false };

  // アイコンだけなら、多く見せられる向きに並べる（同じなら縦）
  // ★ 入り切らないぶんはスクロールで見る ── 向きは「多く入る方」のままでよい
  const down = capacity(box.height, metrics.iconSize);
  const across = capacity(box.width, metrics.iconSize);
  return { direction: down >= across ? "vertical" : "horizontal", labels: false, collapsed: false };
};
