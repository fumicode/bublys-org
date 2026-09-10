/**
 * ピッキング（純粋関数）。Raycaster は使わない。
 *
 * 板は「X を法線に持つ軸並行の長方形」なので、レイとの交点は解析的に出る。
 * three のシーングラフを介さないぶん、テストできるし速い。
 *
 * NDC は `getBoundingClientRect` の**比だけ**で作る。バブルは奥のレイヤーで
 * CSS scale が掛かるが、rect は変換後の実寸なので比を取れば自動で相殺される。
 * 自前で scale を割り戻すと二重補正になる。
 */
import type { Vec3 } from './types.js';
import type { Plate3D } from './types.js';
import type { SlotMap } from './slots.js';
import { slotFromOffset } from './layout3d.js';

export type Ray = { readonly origin: Vec3; readonly dir: Vec3 };

/** クリックとドラッグの区別。ドラッグの終わりで選択が飛ぶのを防ぐ */
export function isClick(
  down: { x: number; y: number; t: number },
  up: { x: number; y: number; t: number },
  maxPx = 4,
  maxMs = 500
): boolean {
  return (
    Math.hypot(up.x - down.x, up.y - down.y) <= maxPx && up.t - down.t <= maxMs
  );
}

/** 画面座標 → NDC。rect の比だけで作る（CSS scale に不変） */
export function ndcFromPointer(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number }
): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -(((clientY - rect.top) / rect.height) * 2 - 1),
  };
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/**
 * NDC からレイを作る（透視投影）。
 * カメラの姿勢は「位置」と「注視点」で与える（up は +Y 固定）。
 */
export function screenToRay(
  ndc: { x: number; y: number },
  cameraPos: Vec3,
  target: Vec3,
  fovDeg: number,
  aspect: number
): Ray {
  const forward = norm(sub(target, cameraPos));
  const upWorld: Vec3 = [0, 1, 0];
  // right = forward × up
  const right = norm([
    forward[1] * upWorld[2] - forward[2] * upWorld[1],
    forward[2] * upWorld[0] - forward[0] * upWorld[2],
    forward[0] * upWorld[1] - forward[1] * upWorld[0],
  ]);
  // up = right × forward
  const up: Vec3 = [
    right[1] * forward[2] - right[2] * forward[1],
    right[2] * forward[0] - right[0] * forward[2],
    right[0] * forward[1] - right[1] * forward[0],
  ];
  const th = Math.tan(((fovDeg * Math.PI) / 180) / 2);
  const dir = norm([
    forward[0] + right[0] * ndc.x * th * aspect + up[0] * ndc.y * th,
    forward[1] + right[1] * ndc.x * th * aspect + up[1] * ndc.y * th,
    forward[2] + right[2] * ndc.x * th * aspect + up[2] * ndc.y * th,
  ]);
  return { origin: cameraPos, dir };
}

export type Pick = {
  readonly scopeId: string;
  readonly nodeId: string;
  /** セルに当たっていれば `${type}:${id}`。板の余白なら null */
  readonly cellKey: string | null;
  readonly distance: number;
};

/**
 * レイが最初に当たった板（とセル）を返す。
 *
 * セルの逆引きは SlotMap の `at` を使う。席は型ごとに行を折り返すので歯抜けがあり、
 * `order[row * cols + col]` のような式で引くと必ずずれる。
 */
export function pickPlate(
  ray: Ray,
  plates: readonly Plate3D[],
  slotMap: SlotMap,
  cellPitch: number
): Pick | null {
  let best: Pick | null = null;
  for (const p of plates) {
    // 板は x = origin[0] の平面
    if (Math.abs(ray.dir[0]) < 1e-9) continue;
    const t = (p.origin[0] - ray.origin[0]) / ray.dir[0];
    if (t <= 0) continue;
    const y = ray.origin[1] + ray.dir[1] * t;
    const z = ray.origin[2] + ray.dir[2] * t;
    const dy = y - p.origin[1];
    const dz = z - p.origin[2];
    if (Math.abs(dy) > p.extentY / 2 || Math.abs(dz) > p.extentZ / 2) continue;
    if (best && t >= best.distance) continue;

    // 板の中のどの席か。式は layout3d の1箇所に寄せる（書き写すとずれる）
    const { row, col } = slotFromOffset(dy, dz, p.extentY, p.extentZ, cellPitch);
    const key = slotMap.at(col, row) ?? null;
    // その席にこのノードでオブジェクトが居るときだけ当たりにする
    const hit = key && p.cells.some((c) => c.key === key) ? key : null;
    best = { scopeId: p.scopeId, nodeId: p.nodeId, cellKey: hit, distance: t };
  }
  return best;
}
