import { StateRef, stateRefKey } from './StateRef';
import { WorldNode, createWorldNode } from './WorldNode';
import { computeStateHash } from './StateHash';

export type ForkChoice = {
  readonly nodeId: string;
  readonly isSameLine: boolean;
  readonly changedRefs: StateRef[];
};

export interface WorldLineGraphJson {
  nodes: Record<string, WorldNode>;
  apexNodeId: string | null;
  rootNodeId: string | null;
}

function generateWorldLineId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `wl-${timestamp}-${random}`;
}

function refMapOf(refs: StateRef[]): Map<string, StateRef> {
  const map = new Map<string, StateRef>();
  for (const ref of refs) {
    map.set(stateRefKey(ref), ref);
  }
  return map;
}

/**
 * 「世界全体の状態」を表すハッシュを作る。type:id ごとの hash を集めてソートし、
 * まとめて1個のハッシュにしたもの。ハッシュが一致する2ノードは同じ全体状態。
 * 入力は既存の ref.hash で、新しくオブジェクトを hash し直すわけではない。
 */
function combinedStateHash(refMap: Map<string, StateRef>): string {
  const entries = Array.from(refMap.values())
    .map((ref): [string, string] => [stateRefKey(ref), ref.hash])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return computeStateHash(entries);
}

export class WorldLineGraph {
  constructor(
    readonly state: {
      readonly nodes: Record<string, WorldNode>;
      readonly apexNodeId: string | null;
      readonly rootNodeId: string | null;
    }
  ) {}

  getApex(): WorldNode | null {
    return this.state.apexNodeId
      ? this.state.nodes[this.state.apexNodeId]
      : null;
  }

  get canUndo(): boolean {
    const apex = this.getApex();
    return apex !== null && apex.parentId !== null;
  }

  get canRedo(): boolean {
    const apex = this.getApex();
    if (!apex) return false;
    const childrenMap = this.getChildrenMap();
    return (childrenMap[apex.id]?.length ?? 0) > 0;
  }

  getForkChoices(nodeId?: string): ForkChoice[] {
    const targetId = nodeId ?? this.state.apexNodeId;
    if (!targetId) return [];
    const target = this.state.nodes[targetId];
    if (!target) return [];
    const childrenMap = this.getChildrenMap();
    const childIds = childrenMap[targetId] ?? [];
    if (childIds.length <= 1) return [];
    return childIds.map((childId) => {
      const childNode = this.state.nodes[childId];
      return {
        nodeId: childId,
        isSameLine: childNode.worldLineId === target.worldLineId,
        changedRefs: childNode.changedRefs,
      };
    });
  }

  static empty(): WorldLineGraph {
    return new WorldLineGraph({
      nodes: {},
      apexNodeId: null,
      rootNodeId: null,
    });
  }

  grow(changedRefs: StateRef[], intentId?: string, intentLabel?: string): WorldLineGraph {
    const { nodes, rootNodeId } = this.state;
    const apex = this.getApex();

    if (!apex) {
      const worldLineId = generateWorldLineId();
      // root の全体状態 = changedRefs そのもの
      const stateHash = combinedStateHash(refMapOf(changedRefs));
      const newNode = createWorldNode(null, changedRefs, worldLineId, stateHash, intentId, intentLabel);
      return new WorldLineGraph({
        nodes: { ...nodes, [newNode.id]: newNode },
        apexNodeId: newNode.id,
        rootNodeId: newNode.id,
      });
    }

    // grow 後の「世界全体の状態」= apex の全体状態 + changedRefs。そのハッシュを1回だけ計算。
    const prospect = this.getStateRefMapAt(apex.id);
    for (const ref of changedRefs) {
      prospect.set(stateRefKey(ref), ref);
    }
    const prospectHash = combinedStateHash(prospect);

    // 打ち消しスナップ：見込み状態が apex の1ステップ隣（apex→root の祖先＝戻る／
    // apex の既存の子＝進む）と一致するなら、新ノードを作らず apex をそのノードへ移す。
    //   - 「操作 → 打ち消し → 元の状態」で祖先に戻り、世界線が無駄に伸びない。
    //   - 「打ち消した操作をもう一度」で既存の枝に合流し、重複ノードを作らない。
    // 各ノードに焼いた stateHash と1回比較するだけなので O(祖先数)。
    const snapTarget = this.findSnapTarget(apex.id, prospectHash);
    if (snapTarget !== null) {
      return this.moveTo(snapTarget);
    }

    const childrenMap = this.getChildrenMap();
    const apexChildren = childrenMap[apex.id] ?? [];

    let worldLineId: string;
    if (apexChildren.length === 0) {
      worldLineId = apex.worldLineId;
    } else {
      worldLineId = generateWorldLineId();
    }

    const newNode = createWorldNode(apex.id, changedRefs, worldLineId, prospectHash, intentId, intentLabel);
    return new WorldLineGraph({
      nodes: { ...nodes, [newNode.id]: newNode },
      apexNodeId: newNode.id,
      rootNodeId,
    });
  }

  /**
   * **世界線に変化を記録する唯一の入口**。
   *
   * ルール: 世界線のノードは「ユーザーが手を下した 1 回（= 1 意図）」につき 1 つ。
   * いま開いている意図が apex を生んだ意図と同じで、かつ apex が leaf なら、
   * 新しいノードを作らずに **その apex を書き換える（amend）**。
   * それ以外（意図が変わった / DAG ジャンプや popstate で apex が動いた / 枝が生えた）は
   * 従来どおり grow する。呼び出し側は分岐を持たない。
   */
  commit(changedRefs: StateRef[], intentId: string | null, intentLabel?: string): WorldLineGraph {
    const apex = this.getApex();
    if (apex && intentId && apex.intentId === intentId && this.isLeaf(apex.id)) {
      return this.amend(changedRefs, intentLabel);
    }
    return this.grow(changedRefs, intentId ?? undefined, intentLabel);
  }

  /** 子を持たない（＝この先に履歴が無い）ノードか */
  private isLeaf(nodeId: string): boolean {
    return (this.getChildrenMap()[nodeId] ?? []).length === 0;
  }

  /**
   * apex のノードの**中身だけ**を差し替える。
   *
   * id / parentId / worldLineId / timestamp / label / intentId は据え置き
   * （id が変わらないので、URL・親バブルの url・履歴・DAG の参照が一切壊れない）。
   * leaf 限定なのは、子が前提にしている親の内容を黙って変えないため（履歴の改竄防止）と、
   * 子孫に焼いた stateHash が腐って打ち消しスナップが誤爆するのを防ぐため。
   * amend では打ち消しスナップを走らせない（同じ意図の途中経過なので移動してはいけない）。
   */
  private amend(changedRefs: StateRef[], intentLabel?: string): WorldLineGraph {
    const apex = this.getApex();
    if (!apex) throw new Error("amend: apex が無い");
    if (!this.isLeaf(apex.id)) throw new Error("amend: 子を持つノードは書き換えない");

    // このノードが「親から見て変えたもの」= 既存の changedRefs に今回ぶんを後勝ちで重ねる
    const merged = refMapOf(apex.changedRefs);
    for (const ref of changedRefs) {
      merged.set(stateRefKey(ref), ref);
    }

    // 全体状態は「親の状態 + merged」。親と同じに戻った ref は changedRefs から刈る
    const base = apex.parentId ? this.getStateRefMapAt(apex.parentId) : new Map<string, StateRef>();
    const prospect = new Map(base);
    for (const [key, ref] of merged) {
      prospect.set(key, ref);
    }
    const pruned = [...merged.values()].filter((ref) => {
      const baseRef = base.get(stateRefKey(ref));
      return !baseRef || baseRef.hash !== ref.hash;
    });

    const amended: WorldNode = {
      ...apex,
      changedRefs: pruned,
      stateHash: combinedStateHash(prospect),
      // 名前はまだ無いときだけ埋める（既に付いている名前は上書きしない）
      ...(apex.intentLabel || !intentLabel ? {} : { intentLabel }),
    };

    return new WorldLineGraph({
      ...this.state,
      nodes: { ...this.state.nodes, [amended.id]: amended },
    });
  }

  /**
   * 見込み状態（prospectHash）と同じ全体状態のノードが apex の1ステップ隣
   * （apex→root の祖先、または apex の直近の子）にあれば、その nodeId を返す（無ければ
   * null）。各ノードに焼いた stateHash と比較するだけ。
   *   - 祖先＝「戻る」：複数一致時は最も apex 寄り（深い）祖先を選び履歴を多く残す。
   *   - 子＝「進む」：打ち消した操作をやり直したとき既存の枝へ合流させ重複を防ぐ。
   * 祖先（apex 自身の no-op を含む）を子より優先する。
   */
  private findSnapTarget(apexId: string, prospectHash: string): string | null {
    // 1) 祖先（apex 含む）を apex 寄り（深い側）から探す
    const path = this.getPathToNode(apexId); // root..apex
    for (let i = path.length - 1; i >= 0; i--) {
      if (this.nodeStateHash(path[i]) === prospectHash) {
        return path[i].id;
      }
    }

    // 2) apex の直近の子を探す
    const childIds = this.getChildrenMap()[apexId] ?? [];
    for (const childId of childIds) {
      if (this.nodeStateHash(this.state.nodes[childId]) === prospectHash) {
        return childId;
      }
    }

    return null;
  }

  /**
   * ノードの全体状態ハッシュを返す。grow 時に焼いた stateHash があればそれを使い（O(1)）、
   * 無い旧データのノードは root からの全 changedRefs を畳み込んで都度計算する。
   */
  private nodeStateHash(node: WorldNode): string {
    if (node.stateHash) {
      return node.stateHash;
    }
    return combinedStateHash(this.getStateRefMapAt(node.id));
  }

  moveTo(nodeId: string): WorldLineGraph {
    if (!this.state.nodes[nodeId]) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    return new WorldLineGraph({
      ...this.state,
      apexNodeId: nodeId,
    });
  }

  /** ノードに表示名（ラベル）を設定/更新する。空文字を渡すと解除。 */
  setNodeLabel(nodeId: string, label: string | undefined): WorldLineGraph {
    const node = this.state.nodes[nodeId];
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    const next: WorldNode = label
      ? { ...node, label }
      : (() => {
          const { label: _, ...rest } = node;
          return rest as WorldNode;
        })();
    return new WorldLineGraph({
      ...this.state,
      nodes: { ...this.state.nodes, [nodeId]: next },
    });
  }

  /** ラベル付きノードのみ抽出（タブ表示用） */
  getLabeledNodes(): WorldNode[] {
    return Object.values(this.state.nodes).filter((n) => !!n.label);
  }

  /**
   * アンカーから派生した leaf 群のうち timestamp が最大のものを返す。
   * 派生が無ければアンカー自身を返す。
   * 「ラベル付きアンカー = 動くブランチ」モデルでクリック時の遷移先を解決するのに使う。
   */
  getLatestDescendantLeaf(anchorId: string): string {
    const anchor = this.state.nodes[anchorId];
    if (!anchor) return anchorId;
    const childrenMap = this.getChildrenMap();
    let bestLeaf = anchorId;
    let bestTime = anchor.timestamp;
    const visit = (id: string): void => {
      const children = childrenMap[id] ?? [];
      if (children.length === 0) {
        const ts = this.state.nodes[id]?.timestamp ?? 0;
        if (ts >= bestTime) {
          bestLeaf = id;
          bestTime = ts;
        }
        return;
      }
      for (const c of children) visit(c);
    };
    visit(anchorId);
    return bestLeaf;
  }

  /**
   * apex がアンカーの系譜内にあるか（apex == anchor または apex の祖先のいずれかが anchor）。
   * 「タブが現在アクティブか」の判定に使う。
   */
  isInLineage(apexId: string, anchorId: string): boolean {
    let cur: string | null = apexId;
    while (cur !== null) {
      if (cur === anchorId) return true;
      cur = this.state.nodes[cur]?.parentId ?? null;
    }
    return false;
  }

  moveBack(): WorldLineGraph {
    const apex = this.getApex();
    if (!apex || apex.parentId === null) {
      return this;
    }
    return new WorldLineGraph({
      ...this.state,
      apexNodeId: apex.parentId,
    });
  }

  moveForward(): WorldLineGraph {
    const { nodes } = this.state;
    const apex = this.getApex();
    if (!apex) {
      return this;
    }

    const childrenMap = this.getChildrenMap();
    const children = childrenMap[apex.id] ?? [];

    if (children.length === 0) {
      return this;
    }

    const sameLineChild = children.find(
      (childId) => nodes[childId].worldLineId === apex.worldLineId
    );

    if (sameLineChild) {
      return new WorldLineGraph({
        ...this.state,
        apexNodeId: sameLineChild,
      });
    }

    return new WorldLineGraph({
      ...this.state,
      apexNodeId: children[0],
    });
  }

  /** root→nodeId の changedRefs を畳み込んだ「全体状態」を type:id→ref の Map で返す（後勝ち） */
  getStateRefMapAt(nodeId: string): Map<string, StateRef> {
    const refMap = new Map<string, StateRef>();
    for (const node of this.getPathToNode(nodeId)) {
      for (const ref of node.changedRefs) {
        refMap.set(stateRefKey(ref), ref);
      }
    }
    return refMap;
  }

  getStateRefsAt(nodeId: string): StateRef[] {
    return Array.from(this.getStateRefMapAt(nodeId).values());
  }

  getCurrentStateRefs(): StateRef[] {
    if (this.state.apexNodeId === null) {
      return [];
    }
    return this.getStateRefsAt(this.state.apexNodeId);
  }

  getChildrenMap(): Record<string, string[]> {
    const { nodes } = this.state;
    const childrenMap: Record<string, string[]> = {};
    for (const node of Object.values(nodes)) {
      if (node.parentId !== null) {
        if (!childrenMap[node.parentId]) {
          childrenMap[node.parentId] = [];
        }
        childrenMap[node.parentId].push(node.id);
      }
    }
    return childrenMap;
  }

  getPathToNode(nodeId: string): WorldNode[] {
    const { nodes } = this.state;
    const path: WorldNode[] = [];
    let currentId: string | null = nodeId;
    while (currentId !== null) {
      const node: WorldNode | undefined = nodes[currentId];
      if (!node) {
        throw new Error(`Node not found: ${currentId}`);
      }
      path.unshift(node);
      currentId = node.parentId;
    }
    return path;
  }

  toJSON(): WorldLineGraphJson {
    return {
      nodes: this.state.nodes,
      apexNodeId: this.state.apexNodeId,
      rootNodeId: this.state.rootNodeId,
    };
  }

  static fromJSON(json: WorldLineGraphJson): WorldLineGraph {
    return new WorldLineGraph({
      nodes: json.nodes,
      apexNodeId: json.apexNodeId,
      rootNodeId: json.rootNodeId,
    });
  }
}
