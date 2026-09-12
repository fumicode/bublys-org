/**
 * カメラの姿勢（純粋関数）。OrbitControls は使わない。
 *
 * ★ 板の法線は **X（時間軸）** であることに注意。板は時間軸に直交する断面
 *   （フィルムのコマ）なので、**板の面を見るには X 軸に沿って見る**（yaw = ±90°）。
 *   yaw = 0（-Z を向く）だと板はエッジオンになり、時間の流れと分岐・入れ子の
 *   構造だけが見える「年表」の絵になる。どちらも要るのでプリセットで切り替える。
 *
 * 使わない理由:
 *  - カメラ挙動がテストできる（デバッグ道具なので「見えている絵が正しい」が担保できること自体が価値）
 *  - wheel の所有権が完全にこちらに来る。バブルは親（BubblesLayeredView）が window の
 *    wheel を握っているので、二重に動くのを確実に止められる
 *  - three/addons の型解決に依存しない
 *
 * 代償として damping と実機ピンチの追従を失う。デバッグ道具なので許容する。
 *
 * 既定の向きは「front view」: X（時間）が画面右、Y（分岐）が画面上、Z（入れ子）が奥。
 * 2Dの世界線ビューが左→右に時間を流しているので、それと同じ読み方になるようにしてある。
 */
import type { Vec3 } from './types.js';

export type Orbit = {
  /** 注視点 */
  readonly target: Vec3;
  /** 水平角（rad）。0 で +Z から見る＝front view */
  readonly yaw: number;
  /** 仰角（rad）。+ で上から見下ろす */
  readonly pitch: number;
  /** 注視点からの距離 */
  readonly distance: number;
};

/** 縦画角。scene.ts のカメラ・fitOrbit・applyPan がこれを共有する（別々に書くと静かにずれる） */
export const DEFAULT_FOV_DEG = 45;

export const PITCH_LIMIT = Math.PI / 2 - 0.05;
export const MIN_DISTANCE = 2;
export const MAX_DISTANCE = 20000;

export function clampOrbit(o: Orbit): Orbit {
  return {
    ...o,
    pitch: Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, o.pitch)),
    distance: Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, o.distance)),
  };
}

/** カメラの位置。yaw=0, pitch=0 なら target + (0,0,d)（＝ -Z を向く front view） */
export function orbitToPosition(o: Orbit): Vec3 {
  const cp = Math.cos(o.pitch);
  return [
    o.target[0] + o.distance * Math.sin(o.yaw) * cp,
    o.target[1] + o.distance * Math.sin(o.pitch),
    o.target[2] + o.distance * Math.cos(o.yaw) * cp,
  ];
}

/** カメラの基底（右・上・前）。yaw/pitch から決まる */
export function cameraBasis(yaw: number, pitch: number): {
  right: Vec3;
  up: Vec3;
  forward: Vec3;
} {
  const sy = Math.sin(yaw),
    cy = Math.cos(yaw),
    sp = Math.sin(pitch),
    cp = Math.cos(pitch);
  return {
    right: [cy, 0, -sy],
    up: [-sy * sp, cp, -cy * sp],
    forward: [-sy * cp, -sp, -cy * cp],
  };
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * 全体が画面に収まる姿勢。
 *
 * **外接球ではなく、その視点から見た「見かけの大きさ」で合わせる。**
 * この図は時間軸(X)にとても長い（板12枚で 170 ほど）のに、分岐(Y)と入れ子(Z)は
 * 10 前後しかない。外接球だと最長軸が距離を決めてしまい、板を正対で見る「板」の
 * 向きでは図が画面の1割ほどに縮んで、セルが数ピクセルになって何も読めなくなる。
 *
 * 箱の8隅をカメラの右/上/前に射影して合わせるので、**どの向きでも必ず収まり、
 * かつ余白が出ない**。向きを変えるたびに合わせ直せばよい（プリセットは合わせ直す）。
 */
export function fitOrbit(
  bounds: { min: Vec3; max: Vec3 },
  aspect: number,
  fovDeg = DEFAULT_FOV_DEG,
  pitch = 0.35,
  yaw = 0
): Orbit {
  const center: Vec3 = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
  const half: Vec3 = [
    Math.max((bounds.max[0] - bounds.min[0]) / 2, 0.5),
    Math.max((bounds.max[1] - bounds.min[1]) / 2, 0.5),
    Math.max((bounds.max[2] - bounds.min[2]) / 2, 0.5),
  ];
  const { right, up, forward } = cameraBasis(yaw, pitch);
  // 軸並行の箱なので、隅を全部回さなくても |half·|axis|| で見かけの半径が出る
  const extent = (axis: Vec3) =>
    half[0] * Math.abs(axis[0]) + half[1] * Math.abs(axis[1]) + half[2] * Math.abs(axis[2]);

  const fov = (fovDeg * Math.PI) / 180;
  const fovH = 2 * Math.atan(Math.tan(fov / 2) * Math.max(aspect, 0.0001));
  const distance =
    Math.max(
      extent(up) / Math.tan(fov / 2),
      extent(right) / Math.tan(fovH / 2)
    ) *
      1.06 +
    // 手前側は近づくぶん大きく写るので、奥行きのぶんだけ引く
    extent(forward);
  return clampOrbit({ target: center, yaw, pitch, distance });
}

/** dot は射影に使う。テストから basis を確かめられるように外に出しておく */
export const projectExtent = (half: Vec3, axis: Vec3) =>
  Math.abs(dot(half, [Math.abs(axis[0]), Math.abs(axis[1]), Math.abs(axis[2])]));

/**
 * 見込みの姿勢（プリセット）。
 * 板の法線が X なので、yaw = ±90° で板の面が正対する。
 */
export const ORBIT_PRESETS = {
  /** 斜め（既定）。板の面を見ながら、時間の奥行きも分かる */
  iso: { yaw: 1.05, pitch: 0.3, label: '斜め' },
  /** 板の面を正対で見る。中身（オブジェクトの並び）が一番読める */
  plates: { yaw: Math.PI / 2, pitch: 0.08, label: '板' },
  /** 年表。時間が右へ流れ、板はエッジオン。分岐と入れ子の構造が読める */
  timeline: { yaw: 0, pitch: 0.15, label: '年表' },
  /** 見下ろし。分岐（Y）と入れ子の段（Z）の配置が読める */
  top: { yaw: 0, pitch: PITCH_LIMIT - 0.1, label: '俯瞰' },
} as const;

// ============================================================================
// ホイール
// ============================================================================

export type WheelInput = {
  readonly deltaX: number;
  readonly deltaY: number;
  /** トラックパッドのピンチは ctrl 付きで来る */
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
};

export type WheelAction =
  | { readonly kind: 'zoom'; readonly amount: number }
  | { readonly kind: 'panTime'; readonly amount: number };

/**
 * ホイールの意味を決める。
 * 素のホイール／ピンチ＝ズーム、shift+縦 と 横スクロール＝時間方向のパン。
 */
export function wheelAction(e: WheelInput): WheelAction {
  if (e.shiftKey) return { kind: 'panTime', amount: e.deltaY };
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return { kind: 'panTime', amount: e.deltaX };
  return { kind: 'zoom', amount: e.deltaY };
}

/** ホイールを姿勢に適用する。panTime は target.x しか動かさない（時間軸に沿って移動する） */
export function applyWheel(orbit: Orbit, action: WheelAction): Orbit {
  if (action.kind === 'zoom') {
    return clampOrbit({
      ...orbit,
      distance: orbit.distance * Math.exp(action.amount * 0.0015),
    });
  }
  const step = orbit.distance * 0.002 * action.amount;
  return {
    ...orbit,
    target: [orbit.target[0] + step, orbit.target[1], orbit.target[2]],
  };
}

/**
 * shift+ドラッグで視点を平行移動する（注視点だけ動かす。回さないしズームもしない）。
 *
 * 動かす向きは**画面の右・上**（＝カメラの right / up）。ワールドの X/Y に沿わせると、
 * 板を正対で見る向き（yaw=90°）で右ドラッグが画面の奥行き方向になり、
 * 「横に動かない」という今の不便が別の形で戻ってくる。
 * 既定の姿勢も斜め（yaw≈1.05）なので、ワールド軸に沿わせた時点で約60°ずれる。
 *
 * shift+ホイールの panTime（時間軸＝ワールドXに厳密に沿う移動）とは役割が割れる:
 *   時間に沿って送りたい → shift+ホイール / 見ている面で自由に滑らせたい → shift+ドラッグ
 *
 * 1px あたりのワールド量は注視点を通る面で測る（距離と画角に比例）。
 * 比例させないと、引いたときは動かず、寄ったときに図が吹っ飛ぶ。
 *
 * @param viewportHeightPx canvas の CSS 高さ。canvas は host に 100% で敷かれているので
 *                         host の rect 高さでよい（中に余白を足すとこの前提が崩れる）
 */
export function applyPan(
  orbit: Orbit,
  dx: number,
  dy: number,
  viewportHeightPx: number,
  fovDeg = DEFAULT_FOV_DEG
): Orbit {
  const { right, up } = cameraBasis(orbit.yaw, orbit.pitch);
  const k =
    (2 * orbit.distance * Math.tan(((fovDeg * Math.PI) / 180) / 2)) /
    Math.max(viewportHeightPx, 1);
  // 掴んだ景色が指についてくる＝注視点は指と逆へ動く
  return {
    ...orbit,
    target: [
      orbit.target[0] + (-right[0] * dx + up[0] * dy) * k,
      orbit.target[1] + (-right[1] * dx + up[1] * dy) * k,
      orbit.target[2] + (-right[2] * dx + up[2] * dy) * k,
    ],
  };
}

/** ドラッグで回す */
export function applyDrag(orbit: Orbit, dx: number, dy: number): Orbit {
  return clampOrbit({
    ...orbit,
    yaw: orbit.yaw - dx * 0.005,
    pitch: orbit.pitch + dy * 0.005,
  });
}
