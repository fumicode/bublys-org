/**
 * 板の上の座標の式。**セルの位置を出す式はこのファイルだけ**。
 *
 * ここを他所へ書き写してはいけない。板の絵（plateCanvas）・出来事の箱（scene）・
 * 当たり判定（picking）・入れ子の口（layout3d）が同じ位置を指すのは、全部がここを
 * 通っているからで、1箇所でも写すと静かにずれる。実際に scene.ts が写して、
 * 「変更の箱」だけがラベル帯と型名欄のぶん浮いていた。
 * その再発は view3d.test.ts が **scene.ts のソースを読んで**見張っている。
 *
 * 板は x = origin[0] の平面。板の法線は X（＝時間軸）で、板は Y×Z に広がる。
 * three にも React にも依存しない純粋関数だけを置く。
 */
import { GUTTER_UNITS, HEADER_UNITS } from './types.js';
import type { Plate3D, Vec3 } from './types.js';

/** ベクトルの足し算。板の origin にセルの相対位置を足すのに使う */
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/**
 * 板の中のセルの中心（板の origin からの相対）。
 *
 * ラベル帯（HEADER_UNITS）のぶんだけ下から始まる。板の絵も同じ比率で描くので、
 * 絵のマス・厚みの箱・当たり判定の3つが必ず同じ位置になる。
 * **セルの位置を出す式はここ1箇所だけ**。他所で書き写すとずれる。
 */
export function cellOffset(
  slot: { col: number; row: number },
  extentY: number,
  extentZ: number,
  cellPitch: number
): Vec3 {
  return [
    0,
    extentY / 2 - cellPitch * (HEADER_UNITS + slot.row + 0.5),
    extentZ / 2 - cellPitch * (GUTTER_UNITS + slot.col + 0.5),
  ];
}

/** 板の上のセルの中心（ワールド座標） */
/**
 * Z（入れ子の段の方向）を法線に持つ軸並行の矩形の4隅。
 * 回り順は (+X,+Y) → (-X,+Y) → (-X,-Y) → (+X,-Y)。
 *
 * 口と奥で**同じ回り順**にしないと、i と i+1 を結んだ側面がねじれる（蝶ネクタイ）。
 */
export function rectCornersXY(
  center: Vec3,
  halfX: number,
  halfY: number
): [Vec3, Vec3, Vec3, Vec3] {
  const [x, y, z] = center;
  return [
    [x + halfX, y + halfY, z],
    [x - halfX, y + halfY, z],
    [x - halfX, y - halfY, z],
    [x + halfX, y - halfY, z],
  ];
}

export function cellCenterWorld(
  plate: Pick<Plate3D, 'origin' | 'extentY' | 'extentZ'>,
  slot: { col: number; row: number },
  cellPitch: number
): Vec3 {
  const off = cellOffset(slot, plate.extentY, plate.extentZ, cellPitch);
  return [plate.origin[0] + off[0], plate.origin[1] + off[1], plate.origin[2] + off[2]];
}

/** ワールド座標の板内オフセットから席を逆算する（cellOffset の逆） */
export function slotFromOffset(
  dy: number,
  dz: number,
  extentY: number,
  extentZ: number,
  cellPitch: number
): { col: number; row: number } {
  return {
    row: Math.floor((extentY / 2 - dy) / cellPitch - HEADER_UNITS),
    col: Math.floor((extentZ / 2 - dz) / cellPitch - GUTTER_UNITS),
  };
}
