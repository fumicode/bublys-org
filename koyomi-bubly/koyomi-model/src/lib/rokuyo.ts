/**
 * 六曜（大安・赤口・先勝・友引・先負・仏滅）。
 *
 * 六曜は旧暦から決まる：（旧暦の月＋旧暦の日）を 6 で割った余り。閏月は同じ番号の月として数える。
 *   0 大安 / 1 赤口 / 2 先勝 / 3 友引 / 4 先負 / 5 仏滅
 * だから旧暦の各月の1日は月ごとに決まっていて、1月・7月の1日は先勝、2月・8月は友引…となる。
 *
 * 旧暦を引けない日（表の範囲の外）は六曜も出さない（undefined）。
 */
import { kyurekiOf, type CalendarDate } from "./kyureki.js";

export type RokuyoId = "taian" | "shakko" | "sensho" | "tomobiki" | "senbu" | "butsumetsu";

export type Rokuyo = {
  id: RokuyoId;
  /** "大安" など */
  label: string;
};

/** （旧暦の月＋日）% 6 の順 */
export const ROKUYO: readonly Rokuyo[] = [
  { id: "taian", label: "大安" },
  { id: "shakko", label: "赤口" },
  { id: "sensho", label: "先勝" },
  { id: "tomobiki", label: "友引" },
  { id: "senbu", label: "先負" },
  { id: "butsumetsu", label: "仏滅" },
];

/** その日の六曜。旧暦を引けない日（2020〜2032年の外）は undefined */
export function rokuyoOf(date: CalendarDate): Rokuyo | undefined {
  const k = kyurekiOf(date);
  return k && ROKUYO[(k.month + k.day) % 6];
}
