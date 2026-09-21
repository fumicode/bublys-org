'use client';

/**
 * WorldLine3DView — 3D の世界線ビュー（プレゼンテーショナル）。
 *
 * three は **useEffect の中で動的 import する**。ここで静的 import すると
 * Next.js の SSR に届き、初期バンドルにもバブリの IIFE にも three が入ってしまう。
 * React.lazy は使わない（このリポジトリには default export も Suspense 境界も無い）。
 *
 * 読み取り専用。世界線には一切書き込まない（覗くだけで世界が動いてはいけない）。
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
} from 'react';
import type { RefLocation } from '../refLocation.js';
import { LOCATION_MARK, LOCATION_ORDER } from '../refLocation.js';
import type { Layout3D, Layout3DOptions } from './types.js';
import { DEFAULT_LAYOUT_3D_OPTIONS } from './types.js';
import {
  DEFAULT_FOV_DEG,
  ORBIT_PRESETS,
  applyPan,
  applyDrag,
  applyWheel,
  fitOrbit,
  wheelAction,
  type Orbit,
} from './camera.js';
import { isClick, ndcFromPointer, pickPlate, screenToRay } from './picking.js';
import {
  ACTION_COLOR,
  ACTION_LABEL,
  ACTION_ORDER,
  PALETTE_3D,
  ROLE_COLOR,
} from './palette3d.js';
// 型だけ。実体は動的 import する（ここで実体を import すると three が静的に見える）
import type { SceneStats, WorldLine3DScene } from './scene.js';

export type Selection3D = {
  readonly scopeId: string;
  readonly nodeId: string;
  readonly cellKey: string | null;
};

export type WorldLine3DViewProps = {
  readonly layout: Layout3D;
  readonly options?: Partial<Layout3DOptions>;
  readonly locate?: (hash: string) => RefLocation;
  readonly selection: Selection3D | null;
  readonly onSelect: (sel: Selection3D | null) => void;
  /** セルの入れ子を開く／閉じる */
  readonly onToggleNested?: (scopeId: string) => void;
  /** 畳んだ入れ子を全部開く。板が多い図では印が要約表示に埋もれるので、HUD 側の逃げ道 */
  readonly onExpandAll?: () => void;
  /** 右側の詳細パネル（feature 層が中身を差し込む） */
  readonly detail?: React.ReactNode;
};

const HUD: React.CSSProperties = {
  position: 'absolute',
  left: 8,
  top: 8,
  padding: '6px 10px',
  borderRadius: 6,
  background: 'rgba(13,17,23,0.82)',
  border: '1px solid #30363d',
  color: '#c9d1d9',
  font: '11px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace',
  pointerEvents: 'none',
  maxWidth: '60%',
};

const btn: React.CSSProperties = {
  background: '#21262d',
  color: '#c9d1d9',
  border: '1px solid #30363d',
  borderRadius: 4,
  padding: '2px 8px',
  cursor: 'pointer',
  font: 'inherit',
  pointerEvents: 'auto',
};

export const WorldLine3DView: FC<WorldLine3DViewProps> = ({
  layout,
  options,
  locate,
  selection,
  onSelect,
  onToggleNested,
  onExpandAll,
  detail,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<WorldLine3DScene | null>(null);
  const orbitRef = useRef<Orbit | null>(null);
  const [stats, setStats] = useState<SceneStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const o: Layout3DOptions = useMemo(
    () => ({ ...DEFAULT_LAYOUT_3D_OPTIONS, ...options }),
    [options]
  );

  // --- 生成と後始末 --------------------------------------------------------
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let scene: WorldLine3DScene | null = null;

    (async () => {
      let mod: typeof import('./scene.js');
      try {
        mod = await import('./scene.js');
      } catch (e) {
        // 握りつぶすと真っ黒な四角が出るだけになる。理由を画面に出す
        setError(`3D の読み込みに失敗しました: ${e instanceof Error ? e.message : String(e)}`);
        return;
      }
      if (disposed || !hostRef.current) return;
      const rect = host.getBoundingClientRect();
      const orbit = fitOrbit(
        layout.bounds,
        Math.max(rect.width, 1) / Math.max(rect.height, 1),
        DEFAULT_FOV_DEG,
        ORBIT_PRESETS.iso.pitch,
        ORBIT_PRESETS.iso.yaw
      );
      orbitRef.current = orbit;
      try {
        scene = mod.createWorldLine3DScene(host, orbit);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return;
      }
      sceneRef.current = scene;
      scene.resize(rect.width, rect.height);
      setReady(true);
    })();

    return () => {
      disposed = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
      setReady(false);
    };
    // 生成は1回だけ。レイアウトの変化は下の effect が拾う
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- レイアウトが変わったら描き直す --------------------------------------
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !ready) return;
    setStats(
      scene.update(
        layout,
        {
          plateThickness: o.plateThickness,
          changedThickness: o.changedThickness,
          cellPitch: o.cellPitch,
          cell: o.cell,
          locate,
          maxTexturedPlates: 160,
        },
        selection ? { scopeId: selection.scopeId, nodeId: selection.nodeId } : null
      )
    );
  }, [layout, o, locate, selection, ready]);

  // --- リサイズ（バブルは自由にリサイズされる） ----------------------------
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // contentRect はレイアウト px。奥レイヤーの CSS scale の影響を受けない
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) sceneRef.current?.resize(r.width, r.height);
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  // --- ホイール（canvas に直付け。親のズームと二重に動かさない） ------------
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !ready) return;
    const canvas = host.querySelector('canvas');
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      // BubblesLayeredView は window の wheel を defaultPrevented を見ずに拾うので、
      // preventDefault だけでなく stopPropagation も要る
      e.preventDefault();
      e.stopPropagation();
      const orbit = orbitRef.current;
      if (!orbit) return;
      const next = applyWheel(orbit, wheelAction(e));
      orbitRef.current = next;
      sceneRef.current?.setOrbit(next);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [ready]);

  // --- ドラッグで回す / クリックで選ぶ --------------------------------------
  const down = useRef<{ x: number; y: number; t: number } | null>(null);
  const dragging = useRef(false);
  /**
   * このドラッグは回すのか、滑らせるのか。**押した瞬間に決めて最後まで変えない**。
   * move ごとに shift を見ると、1ストロークの途中で回転と平行移動が混ざる。
   */
  const gesture = useRef<'orbit' | 'pan'>('orbit');
  /** 直前の位置。movementX は端末画素で来ることがあり、掴んだ点が指からずれる */
  const last = useRef<{ x: number; y: number } | null>(null);
  /** ドラッグ開始時の canvas の高さ。px → ワールドの換算に要る */
  const viewH = useRef(1);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // canvas の上で押したときだけ回転・選択の対象にする。
    // HUD のボタンを押しただけで選択処理が走ってしまうため（実際に踏んだ）
    if ((e.target as Element).tagName !== 'CANVAS') {
      down.current = null;
      last.current = null;
      dragging.current = false;
      gesture.current = 'orbit';
      return;
    }
    down.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    last.current = { x: e.clientX, y: e.clientY };
    dragging.current = true;
    gesture.current = e.shiftKey ? 'pan' : 'orbit';
    viewH.current = Math.max(hostRef.current?.getBoundingClientRect().height ?? 1, 1);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, []);

  const endDrag = useCallback(() => {
    dragging.current = false;
    down.current = null;
    last.current = null;
    // ★ ここでも戻す。pointercancel で終わったときに 'pan' が残ると、
    //   次の素のドラッグが回転ではなく平行移動になる
    gesture.current = 'orbit';
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    // ボタンが離れているのに dragging が立っていたら、キャプチャを失っている
    if (e.buttons === 0 && dragging.current) {
      dragging.current = false;
      down.current = null;
      last.current = null;
      gesture.current = 'orbit';
      return;
    }
    if (!dragging.current || !last.current) return;
    const orbit = orbitRef.current;
    if (!orbit) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    const next =
      gesture.current === 'pan'
        ? applyPan(orbit, dx, dy, viewH.current)
        : applyDrag(orbit, dx, dy);
    orbitRef.current = next;
    sceneRef.current?.setOrbit(next);
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = false;
      const start = down.current;
      const wasPan = gesture.current === 'pan';
      down.current = null;
      last.current = null;
      gesture.current = 'orbit';
      // 平行移動の終わりで選択が飛ばないように。4px 未満でも起こさない
      if (wasPan) return;
      const host = hostRef.current;
      const scene = sceneRef.current;
      const orbit = orbitRef.current;
      if (!start || !host || !scene || !orbit) return;
      // ドラッグの終わりで選択が飛ばないように、クリックのときだけ拾う
      if (!isClick(start, { x: e.clientX, y: e.clientY, t: Date.now() })) return;

      const rect = host.getBoundingClientRect();
      const ndc = ndcFromPointer(e.clientX, e.clientY, rect);
      const ray = screenToRay(
        ndc,
        scene.camera.position,
        orbit.target,
        scene.camera.fov,
        Math.max(rect.width, 1) / Math.max(rect.height, 1)
      );
      const hit = pickPlate(ray, layout.plates, o.cellPitch);
      if (!hit) {
        onSelect(null);
        return;
      }
      onSelect({ scopeId: hit.scopeId, nodeId: hit.nodeId, cellKey: hit.cellKey });
      // 入れ子を持つセルを選んだら、その世界線を開く／閉じる
      if (hit.cellKey && onToggleNested) {
        const plate = layout.plates.find(
          (p) => p.scopeId === hit.scopeId && p.nodeId === hit.nodeId
        );
        const cell = plate?.cells.find((c) => c.key === hit.cellKey);
        if (cell?.nestedScopeId) onToggleNested(cell.nestedScopeId);
      }
    },
    [layout, o.cellPitch, onSelect, onToggleNested]
  );

  const setPreset = useCallback(
    (preset: keyof typeof ORBIT_PRESETS) => {
      const host = hostRef.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const orbit = fitOrbit(
        layout.bounds,
        Math.max(rect.width, 1) / Math.max(rect.height, 1),
        DEFAULT_FOV_DEG,
        ORBIT_PRESETS[preset].pitch,
        ORBIT_PRESETS[preset].yaw
      );
      orbitRef.current = orbit;
      sceneRef.current?.setOrbit(orbit);
    },
    [layout.bounds]
  );

  const d = layout.diagnostics;
  const warnings: string[] = [];
  if (d.violations.length > 0) warnings.push(`⚠ ${d.violations[0]}`);
  if (d.orphanScopeIds.length > 0)
    warnings.push(`図に出ていないスコープ ${d.orphanScopeIds.length} 件`);
  if (d.emptyScopeIds.length > 0)
    warnings.push(`ノードが無いスコープ ${d.emptyScopeIds.length} 件`);
  if (d.orphanNodeIds.length > 0)
    warnings.push(`親を辿れないノード ${d.orphanNodeIds.length} 件`);
  if (d.clockAnomalyNodeIds.length > 0)
    warnings.push(`親より古い時刻のノード ${d.clockAnomalyNodeIds.length} 件`);
  if (stats && stats.summarizedPlates > 0)
    warnings.push(`要約表示 ${stats.summarizedPlates} 枚（中身は省略）`);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex' }}>
      <div
        ref={hostRef}
        style={{
          position: 'relative',
          flex: 1,
          minWidth: 0,
          background: PALETTE_3D.background,
          cursor: 'grab',
          userSelect: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <div style={HUD}>
          <div>
            <strong style={{ color: '#58a6ff' }}>世界線 3D</strong>{' '}
            <span style={{ color: '#8b949e' }}>
              X = 時刻（同時に起きたことは同じ位置） / Y = 分岐 / Z = 入れ子の段
            </span>
          </div>
          <div>
            板 {layout.plates.length} / セル{' '}
            {layout.plates.reduce((n, p) => n + p.cells.length, 0)} / 出来事{' '}
            {stats?.changedCells ?? '…'} / 同一性の線 {layout.identities.length} / 入れ子{' '}
            {layout.nests.length}
          </div>
          <div>
            起きたこと:{' '}
            {ACTION_ORDER.map((a) => (
              <span key={a} style={{ color: ACTION_COLOR[a], marginRight: 8 }}>
                ■{ACTION_LABEL[a]}
              </span>
            ))}
          </div>
          <div>
            値の所在（縁の色）:{' '}
            {LOCATION_ORDER.map((k) => (
              <span key={k} style={{ color: LOCATION_MARK[k].color, marginRight: 8 }}>
                {LOCATION_MARK[k].mark}
                {LOCATION_MARK[k].label}
              </span>
            ))}
            <span style={{ color: PALETTE_3D.nestNominal }}>― 名前規約の入れ子</span>{' '}
            <span style={{ color: PALETTE_3D.nestLinked }}>― アドレス連動の入れ子</span>{' '}
            <span style={{ color: PALETTE_3D.nestLinked }}>●開いている ○畳んでいる</span>
          </div>
          {d.pinnedCount > 0 && (
            <div style={{ color: '#8b949e' }}>
              <span style={{ color: ROLE_COLOR.pinned as string }}>▌固定メンバー</span>{' '}
              {d.pinnedCount} 口（生まれたときに焼き付け。外の変更は届きません）
              {d.pinnedDivergedCount > 0 && (
                <>
                  {' / '}
                  <span style={{ color: ACTION_COLOR.changed }}>
                    うち {d.pinnedDivergedCount} 口は外の現在地と食い違い
                  </span>
                  （＝固定が効いています。セル左下の三角）
                </>
              )}
            </div>
          )}
          {d.pinnedButChangedCount > 0 && (
            <div style={{ color: '#f85149' }}>
              ⚠ 固定と申告されたのに動いたセル {d.pinnedButChangedCount} 件
            </div>
          )}
          {d.tombstoneCount > 0 && (
            <div style={{ color: '#8b949e' }}>
              削除済み {d.tombstoneCount} 件を墓標で表示（2Dインスペクタの件数とはこの分だけ差が出ます）
            </div>
          )}
          {d.hiddenScopeIds.length > 0 && (
            <div style={{ color: '#8b949e' }}>
              畳んで隠れている世界 {d.hiddenScopeIds.length} 件（セルの○印を押すと開きます）
              {onExpandAll && (
                <button
                  type="button"
                  style={{ ...btn, marginLeft: 6 }}
                  onClick={onExpandAll}
                >
                  全部開く
                </button>
              )}
            </div>
          )}
          {d.unprunedChangedCount > 0 && (
            <div style={{ color: '#8b949e' }}>
              参照だけ載って値は変わっていないもの {d.unprunedChangedCount} 件（強調していません）
            </div>
          )}
          {warnings.map((w) => (
            <div key={w} style={{ color: '#f85149' }}>
              {w}
            </div>
          ))}
          <div style={{ marginTop: 4 }}>
            {(['iso', 'plates', 'timeline', 'top'] as const).map((p) => (
              <button
                key={p}
                type="button"
                style={{ ...btn, marginRight: 4 }}
                onClick={() => setPreset(p)}
              >
                {ORBIT_PRESETS[p].label}
              </button>
            ))}
          </div>
          <div style={{ color: '#6e7681' }}>
            ドラッグ=回転 / shift+ドラッグ=平行移動 / ホイール=ズーム /
            shift+ホイール=時間送り（X軸だけ）
          </div>
        </div>
        {error && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              color: '#f85149',
              font: '13px system-ui',
            }}
          >
            {error}
          </div>
        )}
      </div>
      {detail && (
        <div
          style={{
            width: 340,
            flexShrink: 0,
            borderLeft: '1px solid #30363d',
            overflow: 'auto',
            background: PALETTE_3D.background,
          }}
        >
          {detail}
        </div>
      )}
    </div>
  );
};
