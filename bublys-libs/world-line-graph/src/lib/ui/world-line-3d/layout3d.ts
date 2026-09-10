/**
 * computeWorldLine3DLayout — 世界線を3Dの座標に落とす（**three 非依存の純粋関数**）。
 *
 * 座標系（ユーザーの決定「世界線は一つの方向に伸びる／直交させない」を式にしたもの）:
 *   X = 時間   … 全世界線で共通の向き。入れ子の子も同じ +X へ流れる
 *   Y = 分岐   … 枝を +Y へ払い出す
 *   Z = 入れ子 … -Z（奥）へ段を重ねる。**段の間隔は一定**
 *
 * 入れ子の「その場から奥へ」は、Z をセル位置から始めるのではなく
 * **親セル → 子の起点へ伸びる漏斗の線（Nest3D）** で表す。Z をセル位置由来にすると
 * 同じ段の入れ子が行ごとにバラバラの Z に散り、「Z を見れば何段目か」が壊れるため。
 *
 * 間隔は定数ではなく実測（席の数）から導く。そうしないと「重ならない」を証明できない。
 */
import type { WorldLineGraph } from '../../domain/WorldLineGraph.js';
import type { StateRef } from '../../domain/StateRef.js';
import type { RefLocation } from '../refLocation.js';
import {
  DEFAULT_LAYOUT_3D_OPTIONS,
  GUTTER_UNITS,
  HEADER_UNITS,
  type Cell3D,
  type CellRole,
  type OutsideMatch,
  type Edge3D,
  type IdentityLink3D,
  type Layout3D,
  type Layout3DOptions,
  type Nest3D,
  type Plate3D,
  type TimeMode,
  type Vec3,
} from './types.js';
import { buildSlotMap, type SlotMap } from './slots.js';
import { TOMBSTONE_HASH, foldCellStates, type CellState } from './cellStates.js';
import { assignLanes } from './lanes.js';
import {
  deriveScopeTree,
  defaultNestedScopeResolver,
  type NestedScopeResolver,
} from './scopeTree.js';

/**
 * セルの立場（{@link CellRole}）の導出。**バブリ側から注入する**。
 *
 * 引数も `| null` の扱いも {@link NestedScopeResolver} と揃えてある。入れ子も立場も
 * 「スコープ規約から導く、ライブラリの知らない知識」で同じ種類のものなので、
 * 注入口の形を揃えて覚えることを1つにする。
 *
 * `null` は「分からない／該当しない」。**分からないときに 'live' を返さないこと。**
 * 例（hotel）: スタッフは `Schedule:<id>` では 'pinned' だが、
 * グローバル台帳では立場を持たない（null）。同じ型でも世界によって意味が変わる。
 */
export type CellRoleResolver = (
  ref: StateRef,
  currentScopeId: string
) => CellRole | null;

export type Layout3DInput = {
  readonly rootScopeId: string;
  readonly graphs: Readonly<Record<string, WorldLineGraph>>;
  /** 値の所在。feature 層で locateRef を部分適用して渡す。省略時は所在を判定しない */
  readonly locate?: (hash: string) => RefLocation;
  /** 入れ子の導出。省略時は `${type}:${id}` 規約 */
  readonly resolveNestedScopeId?: NestedScopeResolver;
  /**
   * セルの立場の導出。省略時は**全セル null（分からない）**。
   * 誰が固定メンバーかはバブリの規約なので、ライブラリは判定を持たない。
   */
  readonly resolveCellRole?: CellRoleResolver;
  /** 親とアドレス連動しているか（universe だけ true になる想定） */
  readonly isLinked?: (childScopeId: string, parentScopeId: string) => boolean;
  /** X 軸の意味。既定は 'sync'（同時に起きたことは同じ X） */
  readonly timeMode?: TimeMode;
  /**
   * **畳んでいる**入れ子スコープ。省略・空なら全部展開。
   *
   * 「展開している集合」ではなく「畳んでいる集合」にしてあるのが要点。
   * 展開側で持つと「まだ何も操作していない＝集合が無い」状態を表せず、
   * 最初の1回が永久に効かない（実際に踏んだ）。
   */
  readonly collapsedScopeIds?: ReadonlySet<string>;
};

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

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

/**
 * 時刻でノードをまとめ、「同時に起きたこと」に同じ番号を振る。
 *
 * 1つの操作は複数のスコープへ同時に書く（セルを1つ塗ると、その勤務表の世界線と
 * アプリ全体スコープの両方にノードが増える）。書き込む**回数**はスコープごとに違うので、
 * 各スコープのホップ数を X にすると、同時に起きたことが別の位置に並んでしまう。
 * 時刻でまとめれば「同時なら同じ X」になる。
 *
 * @returns nodeId → 時刻クラスタの番号（0 から連番）
 */
export function buildTimeSlots(
  nodes: readonly { readonly id: string; readonly timestamp: number }[],
  toleranceMs: number
): Map<string, number> {
  const sorted = [...nodes].sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
  const slots = new Map<string, number>();
  let slot = -1;
  // ★ 比べる相手は「直前のノード」ではなく**クラスタの先頭**。
  //   直前と比べると、許容時間より短い間隔が続く限りいくらでも数珠つなぎになる
  //   （200ms 間隔で10回編集すると、1.8 秒離れた両端まで「同時」に潰れる）。
  //   先頭から測れば、1つのクラスタの実時間の幅は必ず許容時間以下に収まる。
  let clusterStart = Number.NEGATIVE_INFINITY;
  for (const n of sorted) {
    if (n.timestamp - clusterStart > toleranceMs) {
      slot++;
      clusterStart = n.timestamp;
    }
    slots.set(n.id, Math.max(slot, 0));
  }
  return slots;
}

/** ノードを (timestamp, id) で決定的に並べる。挿入順に頼ると JSON 往復で崩れる */
function sortedNodes(graph: WorldLineGraph) {
  return Object.values(graph.state.nodes).sort(
    (a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id)
  );
}

/** 席の一覧を全スコープ・全ノードの changedRefs から決定的に集める */
function collectTypedKeys(
  graphs: Readonly<Record<string, WorldLineGraph>>,
  scopeIds: readonly string[]
): { type: string; key: string }[] {
  const out: { type: string; key: string }[] = [];
  const seen = new Set<string>();
  for (const scopeId of scopeIds) {
    const graph = graphs[scopeId];
    if (!graph) continue;
    for (const node of sortedNodes(graph)) {
      for (const ref of node.changedRefs) {
        const key = `${ref.type}:${ref.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ type: ref.type, key });
      }
    }
  }
  return out;
}

export function computeWorldLine3DLayout(
  input: Layout3DInput,
  options?: Partial<Layout3DOptions>
): Layout3D {
  const o: Layout3DOptions = { ...DEFAULT_LAYOUT_3D_OPTIONS, ...options };
  const { graphs, rootScopeId } = input;
  const allScopeIds = Object.keys(graphs).sort();
  const nodeCountOf = (s: string) => Object.keys(graphs[s]?.state.nodes ?? {}).length;

  const resolve =
    input.resolveNestedScopeId ??
    defaultNestedScopeResolver((s) => graphs[s] !== undefined);

  // --- 入れ子スコープの導出 -------------------------------------------------
  const tree = deriveScopeTree({
    rootScopeId,
    nodeCountOf,
    refsOf: (scopeId) => {
      const graph = graphs[scopeId];
      if (!graph) return [];
      const out: { nodeId: string; ref: StateRef }[] = [];
      for (const node of sortedNodes(graph)) {
        for (const ref of node.changedRefs) out.push({ nodeId: node.id, ref });
      }
      return out;
    },
    allScopeIds,
    resolve,
    maxDepth: o.maxNestDepth,
    isLinked: input.isLinked,
  });

  const collapsed = input.collapsedScopeIds;
  // 畳まれたスコープと、その子孫を落とす（親が畳まれているのに孫だけ出るのはおかしい）
  const shownScopes = tree.scopes.filter((s) => {
    if (s.level === 0) return true;
    if (!collapsed || collapsed.size === 0) return true;
    let cur: typeof s | undefined = s;
    while (cur && cur.level > 0) {
      if (collapsed.has(cur.scopeId)) return false;
      cur = tree.scopes.find((p) => p.scopeId === cur?.parentScopeId);
    }
    return true;
  });

  // --- 席割り（スコープごと） ----------------------------------------------
  // **世界1つにつき1枚の席表**。全スコープ共通にすると、勤務表の世界（5種類しか
  // 居ない）がアプリ全体スコープ（希望・予約・レポート…）の席数を背負い、板の
  // 9割が空白になってセルが数ピクセルに潰れる。
  // 同一性の線も入れ子の線も**同じスコープの中／親スコープの席**しか参照しないので、
  // 席を世界ごとに詰めても線は繋がったまま。
  const slotMapOf = new Map<string, SlotMap>();
  const extentsOf = new Map<string, { y: number; z: number }>();
  for (const s of shownScopes) {
    const map = buildSlotMap(collectTypedKeys(graphs, [s.scopeId]), o.cols);
    slotMapOf.set(s.scopeId, map);
    // 板の絵（キャンバス）と 1:1 にするため、実際に使う列数ぶんだけ確保し、
    // 高さにはラベル帯、幅には型名欄を含める。ここがずれると絵と当たり判定がずれる。
    extentsOf.set(s.scopeId, {
      y: (Math.max(map.rows, 1) + HEADER_UNITS) * o.cellPitch,
      z: (Math.max(map.cols, 1) + GUTTER_UNITS) * o.cellPitch,
    });
  }
  const maxExtentY = Math.max(1, ...[...extentsOf.values()].map((e) => e.y));
  const maxExtentZ = Math.max(1, ...[...extentsOf.values()].map((e) => e.z));
  // 段と枝の間隔は**一番大きい板**で決める。世界ごとに変えると板同士が重なる
  const lanePitchY = o.lanePitchY > 0 ? o.lanePitchY : maxExtentY * 1.5;
  const nestPitchZ = o.nestPitchZ > 0 ? o.nestPitchZ : maxExtentZ * 1.5;

  // --- スコープごとの下ごしらえ --------------------------------------------
  type ScopeCalc = {
    scopeId: string;
    level: number;
    parentScopeId: string | null;
    anchor: { nodeId: string; key: string } | null;
    kind: 'root' | 'linked' | 'nominal';
    graph: WorldLineGraph;
    lanes: ReadonlyMap<string, number>;
    laneCount: number;
    depths: Map<string, number>;
    states: ReadonlyMap<string, readonly CellState[]>;
    /** この世界の席表と板の大きさ */
    slotMap: SlotMap;
    extentY: number;
    extentZ: number;
    origin: Vec3;
  };

  const shownIds = new Set(shownScopes.map((s) => s.scopeId));
  /**
   * 入れ子の印を付けてよいか。
   *
   * 述語は「図に出ている」ではなく **「この図の入れ子ツリーに居て、その親の板が出ている」**。
   * 「出ている」で判定すると、畳んだ瞬間に親セルの印が消えて開き直せなくなる（片道切符）。
   * かといって「グラフが存在する」まで緩めると、空スコープや段の上限で切ったスコープにも
   * 印が付き、押しても何も起きない別の嘘になる。
   */
  const parentOfScope = new Map(tree.scopes.map((s) => [s.scopeId, s.parentScopeId]));
  const nestedInTree = (scopeId: string | null) => {
    if (!scopeId || !parentOfScope.has(scopeId)) return null;
    const parent = parentOfScope.get(scopeId) ?? null;
    // 親の板が出ていないなら、その印はどの板にも載らない（載ったら嘘）
    return parent === null || shownIds.has(parent) ? scopeId : null;
  };

  const calcs: ScopeCalc[] = [];
  /** スコープID → 現在地の参照表（墓標込み）。固定メンバーの比べ先 */
  const refsAtApexOf = new Map<string, ReadonlyMap<string, StateRef> | null>();
  const orphanNodeIds: string[] = [];
  const clockAnomalyNodeIds: string[] = [];
  let unprunedChangedCount = 0;

  for (const s of shownScopes) {
    const graph = graphs[s.scopeId];
    if (!graph) continue;
    const { of: lanes, laneCount } = assignLanes(graph);
    const fold = foldCellStates(graph);
    refsAtApexOf.set(s.scopeId, fold.refsAtApex);
    orphanNodeIds.push(...fold.orphanNodeIds);
    clockAnomalyNodeIds.push(...fold.clockAnomalyNodeIds);
    unprunedChangedCount += fold.unprunedChangedCount;

    // 世代（X の目盛り）＝親からのホップ数。壊れたグラフでも止まるよう上限を置く
    const depths = new Map<string, number>();
    const nodes = graph.state.nodes;
    for (const id of Object.keys(nodes)) {
      let d = 0;
      let cur = nodes[id]?.parentId ?? null;
      while (cur && d < 10000) {
        d++;
        cur = nodes[cur]?.parentId ?? null;
      }
      depths.set(id, d);
    }

    calcs.push({
      scopeId: s.scopeId,
      level: s.level,
      parentScopeId: s.parentScopeId,
      anchor: s.anchor,
      kind: s.kind,
      graph,
      lanes,
      laneCount,
      depths,
      states: fold.statesByNode,
      slotMap: slotMapOf.get(s.scopeId) ?? buildSlotMap([], o.cols),
      extentY: extentsOf.get(s.scopeId)?.y ?? o.cellPitch,
      extentZ: extentsOf.get(s.scopeId)?.z ?? o.cellPitch,
      origin: [0, 0, 0],
    });
  }

  // --- 起点を決める（浅い段から順に。親の座標が要る） ----------------------
  const plates: Plate3D[] = [];
  const platesByScopeNode = new Map<string, Plate3D>();
  const nests: Nest3D[] = [];
  /** スコープID → その世界の外形（漏斗の奥に使う） */
  const scopeBox = new Map<
    string,
    { x0: number; x1: number; y0: number; y1: number; z: number }
  >();

  // ★ 板ごとの延べで数えない。同じスタッフが1つの世界に9枚の板ぶん出るので、
  //   延べだと「9人の固定メンバー」が「81件」になって人数と読み違える。
  //   数えるのは (世界, オブジェクト) の組＝「焼き付けの口数」
  const pinnedKeys = new Set<string>();
  const pinnedDivergedKeys = new Set<string>();
  const pinnedButChangedKeys = new Set<string>();

  /**
   * 焼き付けた参照が、外の世界の現在地と食い違っているか。
   *
   * 比べ先は**図の起点スコープ（rootScopeId）の現在地**。hotel では焼き付け元が
   * グローバル台帳＝起点スコープなので一致する。起点そのものの板は比べない
   * （自分と自分を比べても何も言えない）。
   *
   * ★ 値ではなく参照（ハッシュ）で比べる。値は CAS から追い出されるが参照は残る。
   * ★ 比べ先が無いときは 'unknown'。'same' に倒すと「合っている」と
   *   「そもそも見ていない」が同じ絵になり、図が嘘をつく。
   */
  function judgeOutside(ref: StateRef, scopeId: string): OutsideMatch {
    if (scopeId === input.rootScopeId) return 'unknown';
    const outsideRefs = refsAtApexOf.get(input.rootScopeId);
    if (!outsideRefs) return 'unknown';
    const there = outsideRefs.get(`${ref.type}:${ref.id}`);
    // 外に居ない／外では墓標になっている。どちらも「外の現在地は持っていない」
    if (!there || there.hash === TOMBSTONE_HASH) return 'absent';
    return there.hash === ref.hash ? 'same' : 'differs';
  }

  /**
   * その世界が origin[1] から**下**へ張り出す量。板の半分だけ。
   *
   * ★ レーン（枝）は `origin[1] + lanePitchY * lane` と **+Y にだけ**伸びる。
   *   だから世界の Y 範囲は origin を中心にしていない。中心とみなして詰めると、
   *   枝の多い兄弟が次の兄弟に丸ごと覆いかぶさる（実際に同じ座標へ乗った）。
   */
  const yBelowOf = (c: ScopeCalc) => c.extentY / 2;
  /** その世界が origin[1] から**上**へ張り出す量。枝のぶんはこちらに全部載る */
  const yAboveOf = (c: ScopeCalc) =>
    Math.max(c.laneCount - 1, 0) * lanePitchY + c.extentY / 2;

  // --- X（時間軸）を決める --------------------------------------------------
  // 'sync': 全スコープのノードを時刻でまとめ、同時なら同じ X に置く。
  //         同じ時刻に同じスコープが複数ノード書いたときだけ、その中で少しずらす
  //         （アプリ全体スコープは1操作でオブジェクトごとに1ノード書くため）。
  const timeMode: TimeMode = input.timeMode ?? 'sync';
  const allNodes = calcs.flatMap((c) =>
    Object.values(c.graph.state.nodes).map((n) => ({ id: n.id, timestamp: n.timestamp }))
  );
  const slotOf = buildTimeSlots(allNodes, o.syncToleranceMs);
  /** (スコープ, 時刻クラスタ) ごとの最小 depth。同時刻の中での並び順の起点にする */
  const baseDepth = new Map<string, number>();
  if (timeMode === 'sync') {
    for (const c of calcs) {
      for (const node of Object.values(c.graph.state.nodes)) {
        const key = `${c.scopeId} ${slotOf.get(node.id) ?? 0}`;
        const d = c.depths.get(node.id) ?? 0;
        const cur = baseDepth.get(key);
        if (cur === undefined || d < cur) baseDepth.set(key, d);
      }
    }
  }
  // ★ クラスタ内のずらしの**合計**が、次のクラスタまでの距離を超えてはいけない。
  //   超えると時間が逆流し（親より子が手前に来る）、板も重なる。
  //   1操作でアプリ全体スコープにオブジェクトごとのノードが書かれるので、
  //   同じクラスタに深さ4以上が入るのは珍しくない。
  let widest = 1;
  if (timeMode === 'sync') {
    const maxDepth = new Map<string, number>();
    for (const c of calcs) {
      for (const node of Object.values(c.graph.state.nodes)) {
        const key = `${c.scopeId} ${slotOf.get(node.id) ?? 0}`;
        const d = c.depths.get(node.id) ?? 0;
        const cur = maxDepth.get(key);
        if (cur === undefined || d > cur) maxDepth.set(key, d);
      }
    }
    for (const [key, d] of maxDepth) widest = Math.max(widest, d - (baseDepth.get(key) ?? 0));
  }
  // 0.9 は「次のクラスタの手前で必ず止まる」ための余白
  const subStep = Math.min(o.subStep, 0.9 / widest);

  const xOf = (c: ScopeCalc, nodeId: string, depth: number): number => {
    if (timeMode === 'hops') return c.origin[0] + o.xStep * depth;
    const slot = slotOf.get(nodeId) ?? 0;
    const base = baseDepth.get(`${c.scopeId} ${slot}`) ?? 0;
    // 同じ時刻・同じスコープの中では depth 順に少しだけずらす（親より子が必ず先へ進む）
    return o.xStep * (slot + (depth - base) * subStep);
  };

  const levels = [...new Set(calcs.map((c) => c.level))].sort((a, b) => a - b);
  for (const level of levels) {
    const atLevel = calcs.filter((c) => c.level === level);

    // 希望の位置（親セルの位置）を出す
    const wishes = atLevel.map((c) => {
      if (!c.parentScopeId || !c.anchor) {
        return { c, wishY: 0, anchorPos: null as Vec3 | null };
      }
      const parentPlate = platesByScopeNode.get(`${c.parentScopeId} ${c.anchor.nodeId}`);
      const slot = slotMapOf.get(c.parentScopeId)?.of(c.anchor.key);
      if (!parentPlate || !slot) return { c, wishY: 0, anchorPos: null as Vec3 | null };
      const anchorPos = add(
        parentPlate.origin,
        cellOffset(slot, parentPlate.extentY, parentPlate.extentZ, o.cellPitch)
      );
      return { c, wishY: anchorPos[1], anchorPos };
    });

    // 同じ段の兄弟が重ならないよう +Y へだけ押し出す（Y 区間パッキング）
    wishes.sort((a, b) => a.wishY - b.wishY || a.c.scopeId.localeCompare(b.c.scopeId));
    let cursor = -Infinity; // 直前に置いた世界の**上端**
    for (const w of wishes) {
      const y =
        cursor === -Infinity
          ? w.wishY
          : Math.max(w.wishY, cursor + yBelowOf(w.c) + maxExtentY * 0.5);
      cursor = y + yAboveOf(w.c);
      const x = w.anchorPos ? w.anchorPos[0] : 0;
      w.c.origin = [x, y, -nestPitchZ * level];
    }

    // 板を作る
    for (const c of atLevel) {
      for (const node of sortedNodes(c.graph)) {
        const depth = c.depths.get(node.id) ?? 0;
        const lane = c.lanes.get(node.id) ?? 0;
        const origin: Vec3 = [
          xOf(c, node.id, depth),
          c.origin[1] + lanePitchY * lane,
          c.origin[2],
        ];
        const states = c.states.get(node.id) ?? [];
        const cells: Cell3D[] = [];
        for (const st of states) {
          const slot = c.slotMap.of(st.key);
          if (!slot) continue;
          const nested = nestedInTree(resolve(st.ref, c.scopeId));
          // 注入されなければ null＝「分からない」。ここで 'live' に倒すと、
          // 立場を知らないバブリの図が「全部この世界のもの」と断言してしまう
          const role = input.resolveCellRole?.(st.ref, c.scopeId) ?? null;
          const outside = role === 'pinned' ? judgeOutside(st.ref, c.scopeId) : null;
          if (role === 'pinned') {
            const pinKey = `${c.scopeId} ${st.key}`;
            pinnedKeys.add(pinKey);
            if (outside === 'differs' || outside === 'absent') pinnedDivergedKeys.add(pinKey);
            // 固定と言ったのに起点より後で動いた＝申告か仕組みのどちらかが壊れている
            if (st.action === 'changed') pinnedButChangedKeys.add(pinKey);
          }
          // 削除マーカーはハッシュが定数なので、locate を渡されなくても判定できる。
          // locate 任せにすると、渡されなかったときに「消えた」が図から落ちる
          cells.push({
            key: st.key,
            type: st.ref.type,
            id: st.ref.id,
            hash: st.ref.hash,
            slot,
            action: st.action,
            inChangedRefs: st.inChangedRefs,
            // 畳んでいる入れ子にも印は付ける（消すと開き直せない）。
            // 出ているかどうかは nestedShown で分けて、絵は中抜きの丸にする
            nestedScopeId: nested,
            nestedShown: nested !== null && shownIds.has(nested),
            role,
            outside,
          });
        }
        const plate: Plate3D = {
          scopeId: c.scopeId,
          nodeId: node.id,
          origin,
          extentY: c.extentY,
          extentZ: c.extentZ,
          cols: c.slotMap.cols,
          rows: c.slotMap.rows,
          depth,
          isApex: node.id === c.graph.state.apexNodeId,
          isRoot: node.id === c.graph.state.rootNodeId,
          label: node.label,
          intentLabel: node.intentLabel,
          timestamp: node.timestamp,
          cells,
        };
        plates.push(plate);
        platesByScopeNode.set(`${c.scopeId} ${node.id}`, plate);
        // 漏斗の奥（＝その世界の手前の面）を張るのに、世界ごとの外形が要る
        const b = scopeBox.get(c.scopeId) ?? {
          x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, z: origin[2],
        };
        b.x0 = Math.min(b.x0, origin[0] - o.plateThickness / 2);
        b.x1 = Math.max(b.x1, origin[0] + o.plateThickness / 2);
        b.y0 = Math.min(b.y0, origin[1] - plate.extentY / 2);
        b.y1 = Math.max(b.y1, origin[1] + plate.extentY / 2);
        b.z = Math.max(b.z, origin[2] + plate.extentZ / 2); // 親に一番近い面
        scopeBox.set(c.scopeId, b);
      }
    }

    // 入れ子の漏斗（親セル → 子の起点）
    for (const w of wishes) {
      if (!w.anchorPos || !w.c.parentScopeId) continue;
      const rootPlate = platesByScopeNode.get(
        `${w.c.scopeId} ${w.c.graph.state.rootNodeId}`
      );
      if (!rootPlate) continue;
      const box = scopeBox.get(w.c.scopeId);
      if (!box) continue;
      // 口＝親セルの位置に置いた小さな矩形。一辺は板の絵の ■ と同じ o.cell
      const mouth = rectCornersXY(w.anchorPos, o.cell / 2, o.cell / 2);
      // 奥＝その世界の**親に一番近い面**（z が最大の側）。ここを口から広げる
      const opening = rectCornersXY(
        [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, box.z],
        Math.max((box.x1 - box.x0) / 2, o.cell / 2),
        Math.max((box.y1 - box.y0) / 2, o.cell / 2)
      );
      nests.push({
        from: w.anchorPos,
        to: rootPlate.origin,
        mouth,
        opening,
        parentScopeId: w.c.parentScopeId,
        childScopeId: w.c.scopeId,
        kind: w.c.kind === 'linked' ? 'linked' : 'nominal',
      });
    }
  }

  // --- 世界線のエッジ -------------------------------------------------------
  const edges: Edge3D[] = [];
  for (const c of calcs) {
    for (const node of sortedNodes(c.graph)) {
      if (!node.parentId) continue;
      const from = platesByScopeNode.get(`${c.scopeId} ${node.parentId}`);
      const to = platesByScopeNode.get(`${c.scopeId} ${node.id}`);
      if (!from || !to) continue;
      edges.push({
        from: from.origin,
        to: to.origin,
        scopeId: c.scopeId,
        kind: from.origin[1] === to.origin[1] ? 'time' : 'branch',
      });
    }
  }

  // --- 同一性の線（同じオブジェクトを時間方向につなぐレール） ---------------
  // 席は全ノードで固定なので、この線は時間軸に平行なまっすぐな線になる。
  // 消えたオブジェクトはそこで途切れる（墓標より先へは伸びない）。
  const identities: IdentityLink3D[] = [];
  for (const c of calcs) {
    for (const node of sortedNodes(c.graph)) {
      if (!node.parentId) continue;
      const from = platesByScopeNode.get(`${c.scopeId} ${node.parentId}`);
      const to = platesByScopeNode.get(`${c.scopeId} ${node.id}`);
      if (!from || !to) continue;
      const parentKeys = new Map(from.cells.map((cell) => [cell.key, cell]));
      for (const cell of to.cells) {
        const prev = parentKeys.get(cell.key);
        // 親に居なかった＝ここで生まれたもの。つなぐ相手がいない
        if (!prev || prev.action === 'deleted') continue;
        identities.push({
          from: cellCenterWorld(from, prev.slot, o.cellPitch),
          to: cellCenterWorld(to, cell.slot, o.cellPitch),
          key: cell.key,
          scopeId: c.scopeId,
          action: cell.action,
          role: cell.role,
        });
      }
    }
  }

  // --- 範囲 -----------------------------------------------------------------
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const p of plates) {
    const half: Vec3 = [
      o.plateThickness / 2 + o.changedThickness,
      p.extentY / 2,
      p.extentZ / 2,
    ];
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], p.origin[i] - half[i]);
      max[i] = Math.max(max[i], p.origin[i] + half[i]);
    }
  }
  if (plates.length === 0) {
    min[0] = min[1] = min[2] = 0;
    max[0] = max[1] = max[2] = 0;
  }

  // 墓標は「消された瞬間のノード」にしか出ないので、全ノードの延べで数えてよい。
  // （もし全ノードに描き続けていたらノード数ぶん水増しされ、申告そのものが嘘になる）
  const tombstoneCount = plates.reduce(
    (n, p) => n + p.cells.filter((c) => c.action === 'deleted').length,
    0
  );

  const base: Layout3D = {
    plates,
    edges,
    identities,
    nests,
    bounds: { min: min as Vec3, max: max as Vec3 },
    grid: {
      cols: Math.max(1, ...[...slotMapOf.values()].map((m) => m.cols)),
      rows: Math.max(1, ...[...slotMapOf.values()].map((m) => m.rows)),
    },
    diagnostics: {
      orphanScopeIds: tree.orphanScopeIds,
      emptyScopeIds: tree.emptyScopeIds,
      orphanNodeIds,
      clockAnomalyNodeIds,
      unprunedChangedCount,
      tombstoneCount,
      pinnedCount: pinnedKeys.size,
      pinnedDivergedCount: pinnedDivergedKeys.size,
      pinnedButChangedCount: pinnedButChangedKeys.size,
      hiddenScopeIds: tree.scopes
        .filter((sc) => !shownIds.has(sc.scopeId))
        .map((sc) => sc.scopeId),
      violations: [],
    },
  };

  return {
    ...base,
    diagnostics: { ...base.diagnostics, violations: findViolations(base, o) },
  };
}

/**
 * 成立していない不変条件を探す。**throw せず一覧で返す**（黙って重ねない）。
 * デバッグ道具なので、壊れているなら壊れていると画面に出すのが正しい。
 */
export function findViolations(layout: Layout3D, o: Layout3DOptions): string[] {
  const v: string[] = [];
  // ★ 実際に隣り合う板の間隔は xStep ではなく **xStep × subStep**。
  //   同じ時刻クラスタの中はこの刻みで並ぶので、xStep だけ見ても意味が無い
  //   （既定は xStep 14 に対して実効 4.48）。
  const step = o.xStep * Math.min(o.subStep, 1);
  if (step <= o.plateThickness + o.changedThickness) {
    v.push(
      `時間方向の間隔が足りない: 実効の間隔 ${step.toFixed(2)}` +
        `（xStep=${o.xStep} × subStep=${o.subStep}） <= 板の厚み ${o.plateThickness} + 変化の厚み ${o.changedThickness}`
    );
  }
  const ps = layout.plates;
  const halfX = o.plateThickness / 2;
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i];
      const b = ps[j];
      if (Math.abs(a.origin[0] - b.origin[0]) >= halfX * 2) continue;
      if (Math.abs(a.origin[1] - b.origin[1]) >= (a.extentY + b.extentY) / 2) continue;
      if (Math.abs(a.origin[2] - b.origin[2]) >= (a.extentZ + b.extentZ) / 2) continue;
      // 1件出れば十分（全部出すと数千行になる）
      v.push(`板が重なっている: ${a.scopeId}/${a.nodeId} と ${b.scopeId}/${b.nodeId}`);
      return v;
    }
  }
  return v;
}
