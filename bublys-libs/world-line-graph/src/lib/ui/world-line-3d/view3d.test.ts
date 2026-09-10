/**
 * カメラ・ピッキング・配色を固定する。
 *
 * 「見えている絵が正しい」をテストで担保できることが、OrbitControls / Raycaster を
 * 使わずに自前で持っている理由そのもの。ここが緩むと自前にした意味が無くなる。
 */
import { WorldLineGraph } from '../../domain/WorldLineGraph.js';
import { createStateRef } from '../../domain/StateRef.js';
import { computeStateHash } from '../../domain/StateHash.js';
import { LOCATION_MARK } from '../refLocation.js';
import { computeWorldLine3DLayout, cellCenterWorld } from './layout3d.js';
import { CELL_PX, HEADER_PX, plateCanvasSize } from './plateCanvas.js';
import { buildSlotMap } from './slots.js';
import { DEFAULT_LAYOUT_3D_OPTIONS } from './types.js';
import { cellStyle, worldLineColor } from './palette3d.js';
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
    const slotMap = buildSlotMap([{ type: 'A', key: 'A:a' }], DEFAULT_LAYOUT_3D_OPTIONS.cols);
    const hit = pickPlate(
      { origin: [plate.origin[0] + 100, plate.origin[1], plate.origin[2]], dir: [-1, 0, 0] },
      layout.plates,
      slotMap,
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
    const slotMap = buildSlotMap(
      [
        { type: 'Staff', key: 'Staff:s1' },
        { type: 'Staff', key: 'Staff:s2' },
        { type: 'Staff', key: 'Staff:s3' },
        { type: 'Schedule', key: 'Schedule:x' },
        { type: 'Log', key: 'Log:l1' },
      ],
      DEFAULT_LAYOUT_3D_OPTIONS.cols
    );
    const o = DEFAULT_LAYOUT_3D_OPTIONS;
    for (const cell of plate.cells) {
      // 式を書き写さない。layout が使うのと同じ関数でセル中心を出す
      const [, cy, cz] = cellCenterWorld(plate, cell.slot, o.cellPitch);
      const hit = pickPlate(
        { origin: [plate.origin[0] + 50, cy, cz], dir: [-1, 0, 0] },
        layout.plates,
        slotMap,
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
      buildSlotMap([{ type: 'A', key: 'A:a' }], 8),
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
      buildSlotMap([{ type: 'A', key: 'A:a' }], 8),
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

describe('palette3d', () => {
  it('色は所在だけで決まる（2Dインスペクタと同じ表）', () => {
    for (const loc of ['memory', 'idb', 'lost'] as const) {
      const s = cellStyle({ changed: false, status: 'present' }, loc, 2.4);
      expect(s.color).toBe(LOCATION_MARK[loc].color);
      // 変わっても色は同じ。違うのは厚みだけ
      const changed = cellStyle({ changed: true, status: 'present' }, loc, 2.4);
      expect(changed.color).toBe(s.color);
      expect(changed.thickness).toBeGreaterThan(s.thickness);
    }
  });

  it('墓標は所在によらず削除済みの色で、厚みを持たない', () => {
    const s = cellStyle({ changed: true, status: 'tombstone' }, 'memory', 2.4);
    expect(s.color).toBe(LOCATION_MARK.tombstone.color);
    expect(s.thickness).toBe(0);
    expect(s.tombstone).toBe(true);
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
      // キャンバス側（paintPlate と同じ式）: 左上原点
      const canvasX = (cell.slot.col + 0.5) * CELL_PX;
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
    const slotMap = {
      of: () => undefined,
      at: (col: number, row: number) => at.get(`${col},${row}`),
      cols: layout.grid.cols,
      rows: layout.grid.rows,
      keys: [],
    };

    for (const cell of plate.cells) {
      // キャンバス上のマスの中心 → 板の上の位置に写す
      const canvasX = (cell.slot.col + 0.5) * CELL_PX;
      const canvasY = HEADER_PX + (cell.slot.row + 0.5) * CELL_PX;
      const wz = plate.origin[2] + plate.extentZ / 2 - (canvasX / size.width) * plate.extentZ;
      const wy = plate.origin[1] + plate.extentY / 2 - (canvasY / size.height) * plate.extentY;
      const hit = pickPlate(
        { origin: [plate.origin[0] + 50, wy, wz], dir: [-1, 0, 0] },
        layout.plates,
        slotMap,
        o.cellPitch
      );
      expect(hit?.cellKey).toBe(cell.key);
    }
  });
});
