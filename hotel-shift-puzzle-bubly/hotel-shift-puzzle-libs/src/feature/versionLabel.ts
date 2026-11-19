/**
 * versionLabel — 確定したノードに付ける名前（#231）
 *
 * 確定すると、その版のノードに「11月4日版」と名前を付ける（確定した日）。いまの確定版は
 * 世界線の二重の輪（節目）が示すので、名前には「確定」を使わない。置き換えられた古い版も
 * 名前付きのノードとして残り、勤務表を見比べられる。
 * 同じ世界線の中で名前が重なったときだけ「11月4日版(2)」のように番号を足す。
 */

/** 確定した日の版の名前。existingLabels（同じ世界線のノードの名前）と重なれば番号を足す（純粋） */
export function versionLabelFor(confirmedAt: Date, existingLabels: Iterable<string>): string {
  const base = `${confirmedAt.getMonth() + 1}月${confirmedAt.getDate()}日版`;
  const taken = new Set(existingLabels);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const label = `${base}(${n})`;
    if (!taken.has(label)) return label;
  }
}
