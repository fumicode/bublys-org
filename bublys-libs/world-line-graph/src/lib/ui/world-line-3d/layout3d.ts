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
  HEADER_UNITS,
  type Cell3D,
  type Edge3D,
  type Layout3D,
  type Layout3DOptions,
  type Nest3D,
  type Plate3D,
  type Vec3,
} from './types.js';
import { computeStateHash } from '../../domain/StateHash.js';
import { buildSlotMap, type SlotMap } from './slots.js';
import { foldCellStates, type CellState } from './cellStates.js';
import { assignLanes } from './lanes.js';
import {
  deriveScopeTree,
  defaultNestedScopeResolver,
  type NestedScopeResolver,
} from './scopeTree.js';

/** 削除マーカーのハッシュ。定数なので値を読まずに判定できる */
export const TOMBSTONE_HASH = computeStateHash(null);

export type Layout3DInput = {
  readonly rootScopeId: string;
  readonly graphs: Readonly<Record<string, WorldLineGraph>>;
  /** 値の所在。feature 層で locateRef を部分適用して渡す。省略時は所在を判定しない */
  readonly locate?: (hash: string) => RefLocation;
  /** 入れ子の導出。省略時は `${type}:${id}` 規約 */
  readonly resolveNestedScopeId?: NestedScopeResolver;
  /** 親とアドレス連動しているか（universe だけ true になる想定） */
  readonly isLinked?: (childScopeId: string, parentScopeId: string) => boolean;
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
    extentZ / 2 - cellPitch * (slot.col + 0.5),
  ];
}

/** 板の上のセルの中心（ワールド座標） */
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
    col: Math.floor((extentZ / 2 - dz) / cellPitch),
  };
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

  // --- 席割り（全スコープ共通。親子でオブジェクトを見比べるため） -----------
  const slotMap: SlotMap = buildSlotMap(
    collectTypedKeys(
      graphs,
      shownScopes.map((s) => s.scopeId)
    ),
    o.cols
  );
  // 板の絵（キャンバス）と 1:1 にするため、列は常に cols ぶん確保し、
  // 高さにはラベル帯を含める。席の数で幅を縮めると絵と格子がずれる。
  const extentY = (Math.max(slotMap.rows, 1) + HEADER_UNITS) * o.cellPitch;
  const extentZ = Math.max(o.cols, 1) * o.cellPitch;
  const lanePitchY = o.lanePitchY > 0 ? o.lanePitchY : extentY * 1.5;
  const nestPitchZ = o.nestPitchZ > 0 ? o.nestPitchZ : extentZ * 1.5;

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
    origin: Vec3;
  };

  const shownIds = new Set(shownScopes.map((s) => s.scopeId));
  const nestedIfShown = (scopeId: string | null) =>
    scopeId && shownIds.has(scopeId) ? scopeId : null;

  const calcs: ScopeCalc[] = [];
  const orphanNodeIds: string[] = [];
  const clockAnomalyNodeIds: string[] = [];
  let unprunedChangedCount = 0;

  for (const s of shownScopes) {
    const graph = graphs[s.scopeId];
    if (!graph) continue;
    const { of: lanes, laneCount } = assignLanes(graph);
    const fold = foldCellStates(graph);
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
      origin: [0, 0, 0],
    });
  }

  // --- 起点を決める（浅い段から順に。親の座標が要る） ----------------------
  const plates: Plate3D[] = [];
  const platesByScopeNode = new Map<string, Plate3D>();
  const nests: Nest3D[] = [];

  const yExtentOf = (c: ScopeCalc) =>
    Math.max(c.laneCount - 1, 0) * lanePitchY + extentY;

  const levels = [...new Set(calcs.map((c) => c.level))].sort((a, b) => a - b);
  for (const level of levels) {
    const atLevel = calcs.filter((c) => c.level === level);

    // 希望の位置（親セルの位置）を出す
    const wishes = atLevel.map((c) => {
      if (!c.parentScopeId || !c.anchor) {
        return { c, wishY: 0, anchorPos: null as Vec3 | null };
      }
      const parentPlate = platesByScopeNode.get(`${c.parentScopeId} ${c.anchor.nodeId}`);
      const slot = slotMap.of(c.anchor.key);
      if (!parentPlate || !slot) return { c, wishY: 0, anchorPos: null as Vec3 | null };
      const anchorPos = add(
        parentPlate.origin,
        cellOffset(slot, extentY, extentZ, o.cellPitch)
      );
      return { c, wishY: anchorPos[1], anchorPos };
    });

    // 同じ段の兄弟が重ならないよう +Y へだけ押し出す（Y 区間パッキング）
    wishes.sort((a, b) => a.wishY - b.wishY || a.c.scopeId.localeCompare(b.c.scopeId));
    let cursor = -Infinity;
    for (const w of wishes) {
      const half = yExtentOf(w.c) / 2;
      const y =
        cursor === -Infinity ? w.wishY : Math.max(w.wishY, cursor + half + extentY * 0.5);
      cursor = y + half;
      const x = w.anchorPos ? w.anchorPos[0] : 0;
      w.c.origin = [x, y, -nestPitchZ * level];
    }

    // 板を作る
    for (const c of atLevel) {
      for (const node of sortedNodes(c.graph)) {
        const depth = c.depths.get(node.id) ?? 0;
        const lane = c.lanes.get(node.id) ?? 0;
        const origin: Vec3 = [
          c.origin[0] + o.xStep * depth,
          c.origin[1] + lanePitchY * lane,
          c.origin[2],
        ];
        const states = c.states.get(node.id) ?? [];
        const cells: Cell3D[] = [];
        for (const st of states) {
          const slot = slotMap.of(st.key);
          if (!slot) continue;
          // 削除マーカーはハッシュが定数なので、locate を渡されなくても判定できる。
          // locate 任せにすると、渡されなかったときに「消えた」が図から落ちる
          const isTomb =
            st.ref.hash === TOMBSTONE_HASH || input.locate?.(st.ref.hash) === 'tombstone';
          cells.push({
            key: st.key,
            type: st.ref.type,
            id: st.ref.id,
            hash: st.ref.hash,
            slot,
            status: isTomb ? 'tombstone' : 'present',
            changed: st.changed,
            inChangedRefs: st.inChangedRefs,
            // 図に出ていないスコープを指す印は付けない（クリックしても何も起きない嘘になる）
            nestedScopeId: nestedIfShown(resolve(st.ref, c.scopeId)),
          });
        }
        const plate: Plate3D = {
          scopeId: c.scopeId,
          nodeId: node.id,
          origin,
          extentY,
          extentZ,
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
      }
    }

    // 入れ子の漏斗（親セル → 子の起点）
    for (const w of wishes) {
      if (!w.anchorPos || !w.c.parentScopeId) continue;
      const rootPlate = platesByScopeNode.get(
        `${w.c.scopeId} ${w.c.graph.state.rootNodeId}`
      );
      if (!rootPlate) continue;
      nests.push({
        from: w.anchorPos,
        to: rootPlate.origin,
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

  // 2Dインスペクタは「いまの世界」の件数を出しているので、差を語るなら apex だけ数える。
  // 全ノードの延べで数えるとノード数ぶん水増しされて、申告そのものが嘘になる
  const tombstoneCount = plates
    .filter((p) => p.isApex)
    .reduce((n, p) => n + p.cells.filter((c) => c.status === 'tombstone').length, 0);

  const base: Layout3D = {
    plates,
    edges,
    nests,
    bounds: { min: min as Vec3, max: max as Vec3 },
    grid: { cols: slotMap.cols, rows: slotMap.rows },
    diagnostics: {
      orphanScopeIds: tree.orphanScopeIds,
      emptyScopeIds: tree.emptyScopeIds,
      orphanNodeIds,
      clockAnomalyNodeIds,
      unprunedChangedCount,
      tombstoneCount,
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
  if (o.xStep <= o.plateThickness + o.changedThickness) {
    v.push(
      `時間方向の間隔が足りない: xStep=${o.xStep} <= 板の厚み ${o.plateThickness} + 変化の厚み ${o.changedThickness}`
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
