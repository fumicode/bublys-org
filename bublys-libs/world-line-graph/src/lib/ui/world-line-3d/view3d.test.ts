/**
 * カメラ・ピッキング・配色を固定する。
 *
 * 「見えている絵が正しい」をテストで担保できることが、OrbitControls / Raycaster を
 * 使わずに自前で持っている理由そのもの。ここが緩むと自前にした意味が無くなる。
 */
import { WorldLineGraph } from '../../domain/WorldLineGraph.js';
import { createStateRef } from '../../domain/StateRef.js';
import { computeStateHash } from '../../domain/StateHash.js';
import { computeWorldLine3DLayout, cellCenterWorld } from './layout3d.js';
import { CELL_PX, GUTTER_PX, HEADER_PX, paintPlate, plateCanvasSize } from './plateCanvas.js';
import { DEFAULT_LAYOUT_3D_OPTIONS } from './types.js';
import { ACTION_COLOR, PALETTE_3D, cellStyle, worldLineColor } from './palette3d.js';
import {
  ORBIT_PRESETS,
  applyDrag,
  applyWheel,
  clampOrbit,
  fitOrbit,
  orbitToPosition,
  wheelAction,
  PITCH_LIMIT,
  type Orbit,
} from './camera.js';
import { applyPan, cameraBasis, projectExtent } from './camera.js';
import type { Plate3D, Vec3 } from './types.js';
import { buildSlotMap } from './slots.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isClick, ndcFromPointer, pickPlate, screenToRay } from './picking.js';

const h = (v: unknown) => computeStateHash(v);
const ref = (type: string, id: string, v: unknown) => createStateRef(type, id, h(v));

describe('camera', () => {
  const bounds = { min: [0, 0, 0] as const, max: [100, 20, 10] as const };

  it('既定（front view）は X が画面右、Y が画面上になる向き', () => {
    const o = fitOrbit(bounds, 16 / 9, 45, 0, 0);
    const pos = orbitToPosition(o);
    // yaw=0, pitch=0 → target の +Z 側に立って -Z を向く
    expect(pos[0]).toBeCloseTo(o.target[0], 9);
    expect(pos[1]).toBeCloseTo(o.target[1], 9);
    expect(pos[2]).toBeGreaterThan(o.target[2]);
  });

  it('全体が収まる距離になる（縦にも横にもはみ出さない）', () => {
    const o = fitOrbit(bounds, 16 / 9, 45);
    const fov = (45 * Math.PI) / 180;
    const halfH = Math.tan(fov / 2) * o.distance;
    const halfW = halfH * (16 / 9);
    expect(halfH * 2).toBeGreaterThanOrEqual(bounds.max[1] - bounds.min[1]);
    expect(halfW * 2).toBeGreaterThanOrEqual(bounds.max[0] - bounds.min[0]);
  });

  /**
   * ★ 図は時間軸に極端に長い（板12枚で 170、分岐と入れ子は 10 前後）。
   * 外接球で合わせると**最長軸が全部の向きの距離を決めてしまう**ので、
   * 板を正対で見る向きでは図が画面の1割に縮み、セルが数ピクセルになって読めない。
   * 見かけの大きさ（視線に垂直な断面）で合わせること。
   */
  it('細長い図でも、一番手前が画面いっぱいに写る（余白を作らない）', () => {
    const long = { min: [0, 0, 0] as const, max: [400, 20, 10] as const };
    const half: Vec3 = [200, 10, 5];
    const fov = (45 * Math.PI) / 180;

    for (const [pitch, yaw] of [
      [0, Math.PI / 2], // 板：長辺が視線方向に寝る
      [0.3, 1.05], // 斜め
      [0.15, 0], // 年表：長辺が画面の横
    ]) {
      const o = fitOrbit(long, 16 / 9, 45, pitch, yaw);
      const { right, up, forward } = cameraBasis(yaw, pitch);
      // 一番手前の隅の位置で、画面の高さ or 幅のどちらかが埋まっていること
      const near = o.distance - projectExtent(half, forward);
      const halfH = Math.tan(fov / 2) * near;
      const fill = Math.max(
        projectExtent(half, up) / halfH,
        projectExtent(half, right) / (halfH * (16 / 9))
      );
      expect(fill).toBeGreaterThan(0.9);
    }
  });

  it('外接球で合わせるより近づく（同じ図でも見かけが大きくなる）', () => {
    const long = { min: [0, 0, 0] as const, max: [400, 20, 10] as const };
    const sphere = (Math.hypot(400, 20, 10) / 2 / Math.sin(((45 * Math.PI) / 180) / 2)) * 1.02;
    for (const [pitch, yaw] of [
      [0, Math.PI / 2],
      [0.15, 0],
    ]) {
      expect(fitOrbit(long, 16 / 9, 45, pitch, yaw).distance).toBeLessThan(sphere);
    }
  });

  it('どの向きから合わせても、箱は画面に収まる', () => {
    const box = { min: [0, 0, 0] as const, max: [400, 20, 10] as const };
    const half: Vec3 = [200, 10, 5];
    const center = [200, 10, 5];
    for (const yaw of [0, 0.7, Math.PI / 2, 2.6, -1.3]) {
      for (const pitch of [0, 0.35, 1.2]) {
        const o = fitOrbit(box, 16 / 9, 45, pitch, yaw);
        const { right, up, forward } = cameraBasis(yaw, pitch);
        const fov = (45 * Math.PI) / 180;
        // 一番手前の隅（＝一番大きく写る）で確かめる
        const depth = o.distance - projectExtent(half, forward);
        const halfH = Math.tan(fov / 2) * depth;
        const halfW = halfH * (16 / 9);
        expect(halfH).toBeGreaterThanOrEqual(projectExtent(half, up));
        expect(halfW).toBeGreaterThanOrEqual(projectExtent(half, right));
        expect(o.target).toEqual(center);
      }
    }
  });

  it('仰角と距離は必ずクランプされる（真上を越えて反転しない）', () => {
    const o = clampOrbit({ target: [0, 0, 0], yaw: 0, pitch: 99, distance: 1e9 });
    expect(o.pitch).toBeCloseTo(PITCH_LIMIT, 9);
    expect(o.distance).toBeLessThanOrEqual(20000);
    expect(clampOrbit({ ...o, distance: 0 }).distance).toBeGreaterThan(0);
  });

  it('ホイールの意味: 素＝ズーム、shift＝時間パン、横スクロール＝時間パン', () => {
    expect(wheelAction({ deltaX: 0, deltaY: 10, ctrlKey: false, metaKey: false, shiftKey: false }).kind).toBe('zoom');
    expect(wheelAction({ deltaX: 0, deltaY: 10, ctrlKey: false, metaKey: false, shiftKey: true }).kind).toBe('panTime');
    expect(wheelAction({ deltaX: 30, deltaY: 2, ctrlKey: false, metaKey: false, shiftKey: false }).kind).toBe('panTime');
  });

  it('時間パンは target.x しか動かさない（時間軸に沿って移動する）', () => {
    const o: Orbit = { target: [10, 5, -3], yaw: 0.2, pitch: 0.3, distance: 50 };
    const moved = applyWheel(o, { kind: 'panTime', amount: 100 });
    expect(moved.target[1]).toBe(o.target[1]);
    expect(moved.target[2]).toBe(o.target[2]);
    expect(moved.target[0]).not.toBe(o.target[0]);
    expect(moved.distance).toBe(o.distance);
  });

  it('ズームは距離だけを変え、注視点は動かさない', () => {
    const o: Orbit = { target: [10, 5, -3], yaw: 0, pitch: 0, distance: 50 };
    const zoomed = applyWheel(o, { kind: 'zoom', amount: -200 });
    expect(zoomed.target).toEqual(o.target);
    expect(zoomed.distance).toBeLessThan(o.distance);
  });

  it('ドラッグで回しても仰角は限界を超えない', () => {
    let o: Orbit = { target: [0, 0, 0], yaw: 0, pitch: 0, distance: 10 };
    for (let i = 0; i < 200; i++) o = applyDrag(o, 0, 50);
    expect(Math.abs(o.pitch)).toBeLessThanOrEqual(PITCH_LIMIT);
  });

  it('プリセットはどれも仰角の限界内', () => {
    for (const p of Object.values(ORBIT_PRESETS)) {
      expect(Math.abs(p.pitch)).toBeLessThanOrEqual(PITCH_LIMIT);
    }
  });
});

describe('picking', () => {
  it('NDC は rect の比だけで決まる（CSS scale が掛かっても同じ）', () => {
    const a = ndcFromPointer(150, 100, { left: 100, top: 50, width: 200, height: 100 });
    // 奥のレイヤーで 0.8 倍に縮んだ状態（rect も原点も縮む）
    const b = ndcFromPointer(120, 80, { left: 80, top: 40, width: 160, height: 80 });
    expect(a.x).toBeCloseTo(b.x, 9);
    expect(a.y).toBeCloseTo(b.y, 9);
  });

  it('中心は (0,0)、左上は (-1,+1)', () => {
    const rect = { left: 0, top: 0, width: 200, height: 100 };
    const center = ndcFromPointer(100, 50, rect);
    expect(center.x).toBeCloseTo(0, 9);
    expect(center.y).toBeCloseTo(0, 9);
    expect(ndcFromPointer(0, 0, rect)).toEqual({ x: -1, y: 1 });
  });

  it('クリックとドラッグを区別する', () => {
    expect(isClick({ x: 0, y: 0, t: 0 }, { x: 2, y: 2, t: 100 })).toBe(true);
    expect(isClick({ x: 0, y: 0, t: 0 }, { x: 50, y: 0, t: 100 })).toBe(false); // 動きすぎ
    expect(isClick({ x: 0, y: 0, t: 0 }, { x: 0, y: 0, t: 900 })).toBe(false); // 長すぎ
  });

  it('板の中心を通るレイは、その板に当たる', () => {
    const g = WorldLineGraph.empty().grow([ref('A', 'a', 1)]);
    const layout = computeWorldLine3DLayout({ rootScopeId: 'app', graphs: { app: g } });
    const plate = layout.plates[0];
    const hit = pickPlate(
      { origin: [plate.origin[0] + 100, plate.origin[1], plate.origin[2]], dir: [-1, 0, 0] },
      layout.plates,
      DEFAULT_LAYOUT_3D_OPTIONS.cellPitch
    );
    expect(hit).toMatchObject({ scopeId: 'app', nodeId: plate.nodeId });
  });

  it('★ どのセルも、その中心を通るレイで自分自身が返る（席の逆引きの往復）', () => {
    // 型を跨いで席を配ると行が折り返して歯抜けになる。式で引くとここがずれる
    const g = WorldLineGraph.empty().grow([
      ref('Staff', 's1', 1),
      ref('Staff', 's2', 2),
      ref('Staff', 's3', 3),
      ref('Schedule', 'x', 4),
      ref('Log', 'l1', 5),
    ]);
    const layout = computeWorldLine3DLayout({ rootScopeId: 'app', graphs: { app: g } });
    const plate = layout.plates[0];
    const o = DEFAULT_LAYOUT_3D_OPTIONS;
    for (const cell of plate.cells) {
      // 式を書き写さない。layout が使うのと同じ関数でセル中心を出す
      const [, cy, cz] = cellCenterWorld(plate, cell.slot, o.cellPitch);
      const hit = pickPlate(
        { origin: [plate.origin[0] + 50, cy, cz], dir: [-1, 0, 0] },
        layout.plates,
        o.cellPitch
      );
      expect(hit?.cellKey).toBe(cell.key);
    }
  });

  it('板の裏側（後ろ向きのレイ）は拾わない', () => {
    const g = WorldLineGraph.empty().grow([ref('A', 'a', 1)]);
    const layout = computeWorldLine3DLayout({ rootScopeId: 'app', graphs: { app: g } });
    const plate = layout.plates[0];
    const hit = pickPlate(
      { origin: [plate.origin[0] + 100, plate.origin[1], plate.origin[2]], dir: [1, 0, 0] },
      layout.plates,
      1.3
    );
    expect(hit).toBeNull();
  });

  it('手前の板を優先する（奥のを貫通して拾わない）', () => {
    const g = WorldLineGraph.empty().grow([ref('A', 'a', 1)]).grow([ref('A', 'a', 2)]);
    const layout = computeWorldLine3DLayout({ rootScopeId: 'app', graphs: { app: g } });
    const sorted = [...layout.plates].sort((a, b) => a.origin[0] - b.origin[0]);
    const far = sorted[0];
    const near = sorted[1];
    const hit = pickPlate(
      { origin: [near.origin[0] + 100, near.origin[1], near.origin[2]], dir: [-1, 0, 0] },
      layout.plates,
      1.3
    );
    expect(hit?.nodeId).toBe(near.nodeId);
    expect(hit?.nodeId).not.toBe(far.nodeId);
  });

  it('カメラ中心のレイは注視点の方を向く', () => {
    const ray = screenToRay({ x: 0, y: 0 }, [0, 0, 100], [0, 0, 0], 45, 1.5);
    expect(ray.dir[2]).toBeLessThan(0);
    expect(Math.abs(ray.dir[0])).toBeLessThan(1e-9);
  });
});

describe('席割り', () => {
  it('★ 実際に埋まった列数だけ確保する（折り返しの上限まで広げない）', () => {
    // 上限8だが、型が3つで各1個なら列は1つしか使わない
    const map = buildSlotMap(
      [
        { type: 'A', key: 'A:a' },
        { type: 'B', key: 'B:b' },
        { type: 'C', key: 'C:c' },
      ],
      8
    );
    expect(map.cols).toBe(1);
    expect(map.rows).toBe(3);
  });

  it('折り返すときは上限まで使う', () => {
    const keys = Array.from({ length: 10 }, (_, i) => ({ type: 'A', key: `A:${i}` }));
    const map = buildSlotMap(keys, 4);
    expect(map.cols).toBe(4);
    expect(map.rows).toBe(3); // 4 + 4 + 2
  });

  it('空でも 1 列 1 行は確保する（0 で割らないため）', () => {
    const map = buildSlotMap([], 8);
    expect(map.cols).toBe(1);
    expect(map.rows).toBe(1);
  });
});

describe('applyPan — shift+ドラッグで視点を滑らせる', () => {
  const base = { target: [10, 2, -3] as Vec3, yaw: 1.05, pitch: 0.3, distance: 40 };

  it('回さないしズームもしない（注視点だけ動く）', () => {
    const p = applyPan(base, 30, -20, 800);
    expect(p.yaw).toBe(base.yaw);
    expect(p.pitch).toBe(base.pitch);
    expect(p.distance).toBe(base.distance);
    expect(p.target).not.toEqual(base.target);
  });

  it('★ 視線方向には動かない（奥行きが変わったら「平行移動」ではない）', () => {
    for (const [yaw, pitch] of [
      [0, 0],
      [1.05, 0.3],
      [Math.PI / 2, 0.08],
      [-2.2, -0.7],
    ]) {
      const o = { ...base, yaw, pitch };
      const p = applyPan(o, 37, -13, 800);
      const { forward } = cameraBasis(yaw, pitch);
      const d: Vec3 = [
        p.target[0] - o.target[0],
        p.target[1] - o.target[1],
        p.target[2] - o.target[2],
      ];
      expect(d[0] * forward[0] + d[1] * forward[1] + d[2] * forward[2]).toBeCloseTo(0, 9);
    }
  });

  it('横だけドラッグしたら高さは変わらない（画面の右に沿って動く）', () => {
    const p = applyPan(base, 50, 0, 800);
    expect(p.target[1]).toBeCloseTo(base.target[1], 9);
    // 板を正対で見る向きでも、横ドラッグはちゃんと横（Z）に効く。
    // ワールドXに沿わせると、この向きで横に動かなくなる
    const plates = applyPan({ ...base, yaw: Math.PI / 2, pitch: 0 }, 50, 0, 800);
    expect(Math.abs(plates.target[2] - base.target[2])).toBeGreaterThan(1);
  });

  it('掴んだ景色が指についてくる（注視点は指と逆へ動く）', () => {
    // yaw=0 なら画面の右＝ワールド +X。右へドラッグ＝景色が右へ＝注視点は -X
    const p = applyPan({ ...base, yaw: 0, pitch: 0 }, 50, 0, 800);
    expect(p.target[0]).toBeLessThan(base.target[0]);
  });

  it('引くほど1pxが大きく効く（距離に比例。しないと遠景で動かなくなる）', () => {
    const near = applyPan({ ...base, distance: 10 }, 50, 0, 800);
    const far = applyPan({ ...base, distance: 100 }, 50, 0, 800);
    const move = (p: typeof near) => Math.abs(p.target[0] - base.target[0]);
    expect(move(far)).toBeCloseTo(move(near) * 10, 6);
  });
});

/**
 * ★ セルの位置を出す式は layout3d の1箇所だけ、という規律の見張り。
 *
 * これが無かったせいで scene.ts が式を書き写し、ラベル帯と型名欄のぶんだけ
 * 「変更の箱」だけが板の絵の ■ からずれていた。scene.ts は three を静的 import
 * するので Jest から読み込めない＝振る舞いのテストが書けない。
 * だから**書き写しそのもの**を禁じる。
 */
describe('セルの座標の出所', () => {
  it('scene.ts はセルの位置を自分で計算しない（cellCenterWorld を使う）', () => {
    const src = readFileSync(join(__dirname, 'scene.ts'), 'utf-8');
    expect(src).toContain('cellCenterWorld');
    // `cellPitch * (... slot.row ...)` のような手書きの式が無いこと
    expect(src).not.toMatch(/cellPitch\s*\*\s*\(\s*cell\.slot/);
    expect(src).not.toMatch(/extentY\s*\/\s*2\s*-\s*opts\.cellPitch/);
  });
});

describe('palette3d', () => {
  it('色は「何が起きたか」で決まる（作られた=白 / 変わった=黄 / 消された=赤）', () => {
    expect(cellStyle({ action: 'created' }, 'memory', 2.4).color).toBe(ACTION_COLOR.created);
    expect(cellStyle({ action: 'changed' }, 'memory', 2.4).color).toBe(ACTION_COLOR.changed);
    expect(cellStyle({ action: 'deleted' }, 'memory', 2.4).color).toBe(ACTION_COLOR.deleted);
  });

  it('出来事のあったセルだけ厚みと縁を持ち、何も起きていないセルは薄い', () => {
    const still = cellStyle({ action: 'unchanged' }, 'memory', 2.4);
    const made = cellStyle({ action: 'created' }, 'memory', 2.4);
    expect(still.thickness).toBe(0);
    expect(still.ring).toBe(false);
    expect(made.thickness).toBeGreaterThan(0);
    expect(made.ring).toBe(true);
    expect(still.opacity).toBeLessThan(made.opacity);
  });

  it('消されたセルは墓標。厚みは持たない（消えたものが手前に飛び出さない）', () => {
    const s = cellStyle({ action: 'deleted' }, 'memory', 2.4);
    expect(s.thickness).toBe(0);
    expect(s.tombstone).toBe(true);
  });

  it('値の所在は色相ではなく明るさに効く（出来事の色を潰さない）', () => {
    const inMemory = cellStyle({ action: 'changed' }, 'memory', 2.4);
    const lost = cellStyle({ action: 'changed' }, 'lost', 2.4);
    expect(lost.color).toBe(inMemory.color); // 色相は同じ
    expect(lost.opacity).toBeLessThan(inMemory.opacity); // 薄くなる
  });

  it('世界線の色は決定的', () => {
    expect(worldLineColor('abc')).toBe(worldLineColor('abc'));
    expect(worldLineColor('abc')).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('板の絵と 3D の格子が同じ位置にあること（レビューで見つかった嘘の再発防止）', () => {
  // 絵（キャンバス）と、厚みの箱・当たり判定が別々の格子に乗っていて、
  // クリックしたセルと違うセルが右パネルに出ていた。両者が1つの値から導かれることを固定する。
  it('キャンバスの縦横比が板の縦横比と一致する', () => {
    const g = WorldLineGraph.empty().grow([
      ref('Staff', 's1', 1),
      ref('Schedule', 'x', 2),
    ]);
    const layout = computeWorldLine3DLayout({ rootScopeId: 'app', graphs: { app: g } });
    const plate = layout.plates[0];
    const size = plateCanvasSize(layout.grid);
    // 絵をそのまま板に貼るので、比が違うとセルの位置が必ずずれる
    expect(size.width / size.height).toBeCloseTo(plate.extentZ / plate.extentY, 9);
  });

  it('キャンバス上のセル中心の比率が、板の上のセル中心の比率と一致する', () => {
    const g = WorldLineGraph.empty().grow([
      ref('Staff', 's1', 1),
      ref('Staff', 's2', 2),
      ref('Schedule', 'x', 3),
      ref('Log', 'l1', 4),
    ]);
    const layout = computeWorldLine3DLayout({ rootScopeId: 'app', graphs: { app: g } });
    const plate = layout.plates[0];
    const size = plateCanvasSize(layout.grid);
    const o = DEFAULT_LAYOUT_3D_OPTIONS;

    for (const cell of plate.cells) {
      // キャンバス側（paintPlate と同じ式）: 左上原点。左に型名欄がある
      const canvasX = GUTTER_PX + (cell.slot.col + 0.5) * CELL_PX;
      const canvasY = HEADER_PX + (cell.slot.row + 0.5) * CELL_PX;
      // 板側（layout と同じ関数）: 中心原点。左上からの比率に直す
      const [, wy, wz] = cellCenterWorld(plate, cell.slot, o.cellPitch);
      const plateFromLeft = plate.origin[2] + plate.extentZ / 2 - wz;
      const plateFromTop = plate.origin[1] + plate.extentY / 2 - wy;

      expect(canvasX / size.width).toBeCloseTo(plateFromLeft / plate.extentZ, 9);
      expect(canvasY / size.height).toBeCloseTo(plateFromTop / plate.extentY, 9);
    }
  });

  it('キャンバス上のセル中心を狙ったレイが、そのセルを返す（絵→世界→当たり判定の往復）', () => {
    const g = WorldLineGraph.empty().grow([
      ref('Staff', 's1', 1),
      ref('Staff', 's2', 2),
      ref('Staff', 's3', 3),
      ref('Schedule', 'x', 4),
      ref('Log', 'l1', 5),
    ]);
    const layout = computeWorldLine3DLayout({ rootScopeId: 'app', graphs: { app: g } });
    const plate = layout.plates[0];
    const size = plateCanvasSize(layout.grid);
    const o = DEFAULT_LAYOUT_3D_OPTIONS;
    // レイアウトが配った席をそのまま逆引きに使う（View と同じやり方）
    const at = new Map<string, string>();
    for (const c of plate.cells) at.set(`${c.slot.col},${c.slot.row}`, c.key);

    for (const cell of plate.cells) {
      // キャンバス上のマスの中心 → 板の上の位置に写す
      const canvasX = GUTTER_PX + (cell.slot.col + 0.5) * CELL_PX;
      const canvasY = HEADER_PX + (cell.slot.row + 0.5) * CELL_PX;
      const wz = plate.origin[2] + plate.extentZ / 2 - (canvasX / size.width) * plate.extentZ;
      const wy = plate.origin[1] + plate.extentY / 2 - (canvasY / size.height) * plate.extentY;
      const hit = pickPlate(
        { origin: [plate.origin[0] + 50, wy, wz], dir: [-1, 0, 0] },
        layout.plates,
        o.cellPitch
      );
      expect(hit?.cellKey).toBe(cell.key);
    }
  });
});

/**
 * 板の絵（paintPlate）は jsdom に本物の 2D コンテキストが無いので、
 * 記録するだけの偽 ctx を渡して「何をどの α で描いたか」を見る。
 *
 * ここが無いと、選択中の板を不透明にする分岐も、畳んだ入れ子の○印も、
 * 黙って戻っても誰も気づかない（scene.ts は three 込みで Jest から読めない）。
 */
describe('板の絵', () => {
  type Op = { op: string; alpha: number; fill: string; stroke: string };
  function fakeCanvas() {
    const ops: Op[] = [];
    const ctx = {
      globalAlpha: 1,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textBaseline: '',
      clearRect: () => undefined,
      fillRect: () => ops.push(rec('fillRect')),
      strokeRect: () => ops.push(rec('strokeRect')),
      fillText: () => ops.push(rec('fillText')),
      beginPath: () => undefined,
      moveTo: () => undefined,
      lineTo: () => undefined,
      arc: () => undefined,
      stroke: () => ops.push(rec('stroke')),
      fill: () => ops.push(rec('fill')),
    };
    const rec = (op: string): Op => ({
      op,
      alpha: ctx.globalAlpha,
      fill: String(ctx.fillStyle),
      stroke: String(ctx.strokeStyle),
    });
    return {
      ops,
      canvas: { width: 0, height: 0, getContext: () => ctx } as unknown as HTMLCanvasElement,
    };
  }

  const plateOf = (over: Partial<Plate3D> = {}): Plate3D => ({
    scopeId: 'app',
    nodeId: 'n1',
    origin: [0, 0, 0],
    extentY: 4,
    extentZ: 14,
    cols: 2,
    rows: 2,
    depth: 0,
    isApex: false,
    isRoot: false,
    timestamp: 0,
    cells: [
      {
        key: 'Schedule:x',
        type: 'Schedule',
        id: 'x',
        hash: 'h1',
        slot: { col: 0, row: 0 },
        action: 'unchanged',
        inChangedRefs: false,
        nestedScopeId: 'Schedule:x',
        nestedShown: true,
      },
    ],
    ...over,
  });

  it('★ 選択中の板はセルを不透明で描く（薄さで奥へ引っ込めない）', () => {
    const plain = fakeCanvas();
    paintPlate(plain.canvas, plateOf(), { cols: 2, rows: 2 });
    const sel = fakeCanvas();
    paintPlate(sel.canvas, plateOf(), { cols: 2, rows: 2, selected: true });

    // セル本体は fillRect。下地の fillRect（1枚目）は板の透け方なので除く
    const cellAlpha = (o: typeof plain) =>
      o.ops.filter((x) => x.op === 'fillRect').slice(1).map((x) => x.alpha);
    expect(cellAlpha(plain).length).toBeGreaterThan(0);
    expect(cellAlpha(plain).every((a) => a < 1)).toBe(true);
    expect(cellAlpha(sel).every((a) => a === 1)).toBe(true);
  });

  it('★ 入れ子の印は、畳んでいても消えない（塗りつぶし→中抜きに変わるだけ）', () => {
    const open = fakeCanvas();
    paintPlate(open.canvas, plateOf(), { cols: 2, rows: 2 });
    const shut = fakeCanvas();
    paintPlate(
      shut.canvas,
      plateOf({
        cells: [{ ...plateOf().cells[0], nestedShown: false }],
      }),
      { cols: 2, rows: 2 }
    );
    // 開いている＝丸を塗る / 畳んでいる＝丸を描く（stroke）。どちらでも印は出る
    expect(open.ops.some((o) => o.op === 'fill' && o.fill === PALETTE_3D.nestLinked)).toBe(true);
    expect(shut.ops.some((o) => o.op === 'fill' && o.fill === PALETTE_3D.nestLinked)).toBe(false);
    expect(shut.ops.some((o) => o.op === 'stroke' && o.stroke === PALETTE_3D.nestLinked)).toBe(true);
  });

  it('型名は行の先頭に出す（■だけでは何のオブジェクトか読めない）', () => {
    const c = fakeCanvas();
    paintPlate(c.canvas, plateOf(), { cols: 2, rows: 2 });
    expect(c.ops.filter((o) => o.op === 'fillText').length).toBeGreaterThanOrEqual(2);
  });
});
