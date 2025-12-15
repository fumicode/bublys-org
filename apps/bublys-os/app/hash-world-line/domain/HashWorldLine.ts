/**
 * HashWorldLine
 * 世界線ドメインモデル
 *
 * 複数オブジェクトの状態履歴を DAG（有向非巡回グラフ）として管理する。
 * 各ノードは「世界全体の状態」のスナップショットを表す。
 */
import { StateSnapshot } from './StateSnapshot';
import { WorldState, WorldStateJson } from './WorldState';
import { normalizeJson, computeHash } from './hashUtils';

/**
 * WorldHistoryNode
 * 世界線の履歴ノード（DAG構造）
 */
export interface WorldHistoryNode {
  /** タイムスタンプ（ミリ秒） */
  timestamp: number;
  /** この時点での世界全体の状態ハッシュ */
  worldStateHash: string;
  /** この時点で変更されたオブジェクト */
  changedObjects: StateSnapshot[];
  /** 親ノード（DAG）のハッシュ。最初のノードは undefined */
  parentWorldStateHash?: string;
  /** 変更を行ったユーザー */
  userId?: string;
  /** 変更の説明 */
  description?: string;
}

/**
 * HistoryDAGNode
 * DAG描画用のノード情報
 */
export interface HistoryDAGNode {
  /** 元の履歴ノード */
  node: WorldHistoryNode;
  /** ルートからの深さ */
  depth: number;
  /** 分岐番号（0がメイン、1以降が分岐） */
  branch: number;
  /** 現在位置からルートまでの経路上にあるか */
  isOnCurrentPath: boolean;
  /** 現在位置かどうか */
  isCurrent: boolean;
  /** 子ノード */
  children: WorldHistoryNode[];
}

/**
 * HashWorldLine
 * 世界線ドメインモデル
 */
export class HashWorldLine {
  constructor(
    readonly state: {
      /** 世界線のID */
      id: string;
      /** 世界線の名前 */
      name: string;
      /** 現在の世界の状態 */
      currentState: WorldState;
      /** 履歴（DAG構造） */
      history: WorldHistoryNode[];
      /** 現在参照している履歴のインデックス（-1 は履歴なし） */
      currentHistoryIndex: number;
    }
  ) {}

  /**
   * 新しい世界線を作成
   */
  static create(id: string, name: string): HashWorldLine {
    return new HashWorldLine({
      id,
      name,
      currentState: WorldState.empty(),
      history: [],
      currentHistoryIndex: -1,
    });
  }

  /**
   * 現在の世界状態を取得
   */
  getCurrentState(): WorldState {
    return this.state.currentState;
  }

  /**
   * 履歴を取得
   */
  getHistory(): WorldHistoryNode[] {
    return this.state.history;
  }

  /**
   * 現在参照している履歴のインデックスを取得
   */
  getCurrentHistoryIndex(): number {
    return this.state.currentHistoryIndex;
  }

  /**
   * 現在参照している履歴ノードを取得
   */
  getCurrentHistoryNode(): WorldHistoryNode | undefined {
    if (this.state.currentHistoryIndex === -1) return undefined;
    return this.state.history[this.state.currentHistoryIndex];
  }

  /**
   * 最新の履歴ノードを取得（履歴全体の末尾）
   */
  getLatestHistoryNode(): WorldHistoryNode | undefined {
    return this.state.history[this.state.history.length - 1];
  }

  /**
   * 現在位置が最新かどうか
   */
  isAtLatest(): boolean {
    return this.state.currentHistoryIndex === this.state.history.length - 1;
  }

  /**
   * 現在位置より未来の履歴があるか
   */
  hasFuture(): boolean {
    return this.state.currentHistoryIndex < this.state.history.length - 1;
  }

  /**
   * オブジェクトの状態を更新
   * 現在参照位置から新しい履歴を追加する
   */
  async updateObjectState(
    snapshot: StateSnapshot,
    userId?: string,
    description?: string
  ): Promise<HashWorldLine> {
    const newCurrentState = this.state.currentState.setSnapshot(snapshot);
    const worldStateHash = await computeWorldStateHash(newCurrentState);

    const currentNode = this.getCurrentHistoryNode();
    const newHistoryNode: WorldHistoryNode = {
      timestamp: Date.now(),
      worldStateHash,
      changedObjects: [snapshot],
      parentWorldStateHash: currentNode?.worldStateHash,
      userId,
      description,
    };

    // 新しい履歴を末尾に追加し、currentHistoryIndexを更新
    const newHistory = [...this.state.history, newHistoryNode];

    return new HashWorldLine({
      ...this.state,
      currentState: newCurrentState,
      history: newHistory,
      currentHistoryIndex: newHistory.length - 1,
    });
  }

  /**
   * 複数オブジェクトの状態を一度に更新
   * 現在参照位置から新しい履歴を追加する
   */
  async updateObjectStates(
    snapshots: StateSnapshot[],
    userId?: string,
    description?: string
  ): Promise<HashWorldLine> {
    const newCurrentState = this.state.currentState.setSnapshots(snapshots);
    const worldStateHash = await computeWorldStateHash(newCurrentState);

    const currentNode = this.getCurrentHistoryNode();
    const newHistoryNode: WorldHistoryNode = {
      timestamp: Date.now(),
      worldStateHash,
      changedObjects: snapshots,
      parentWorldStateHash: currentNode?.worldStateHash,
      userId,
      description,
    };

    // 新しい履歴を末尾に追加し、currentHistoryIndexを更新
    const newHistory = [...this.state.history, newHistoryNode];

    return new HashWorldLine({
      ...this.state,
      currentState: newCurrentState,
      history: newHistory,
      currentHistoryIndex: newHistory.length - 1,
    });
  }

  /**
   * 世界線を特定の状態に移動する（参照位置を変更）
   * 履歴は削除せず、currentHistoryIndex を変更するだけ
   * DAG構造を考慮し、親をたどって状態を再構築する
   */
  moveTo(worldStateHash: string): HashWorldLine | undefined {
    const targetIndex = this.state.history.findIndex(
      (node) => node.worldStateHash === worldStateHash
    );
    if (targetIndex === -1) return undefined;

    // DAG構造: 親をたどって経路上のノードを収集
    const pathNodes: WorldHistoryNode[] = [];
    let currentHash: string | undefined = worldStateHash;

    while (currentHash) {
      const node = this.state.history.find((n) => n.worldStateHash === currentHash);
      if (!node) break;
      pathNodes.unshift(node); // 先頭に追加（古い順にする）
      currentHash = node.parentWorldStateHash;
    }

    // 経路上のノードの変更を順に適用してcurrentStateを再構築
    let newCurrentState = WorldState.empty();
    for (const node of pathNodes) {
      newCurrentState = newCurrentState.setSnapshots(node.changedObjects);
    }

    return new HashWorldLine({
      ...this.state,
      currentState: newCurrentState,
      currentHistoryIndex: targetIndex,
    });
  }

  /**
   * 一つ前の状態に戻る
   */
  moveBack(): HashWorldLine | undefined {
    if (this.state.currentHistoryIndex <= 0) return undefined;
    const targetNode = this.state.history[this.state.currentHistoryIndex - 1];
    return this.moveTo(targetNode.worldStateHash);
  }

  /**
   * 一つ後の状態に進む
   */
  moveForward(): HashWorldLine | undefined {
    if (this.state.currentHistoryIndex >= this.state.history.length - 1) return undefined;
    const targetNode = this.state.history[this.state.currentHistoryIndex + 1];
    return this.moveTo(targetNode.worldStateHash);
  }

  /**
   * 最新の状態に移動
   */
  moveToLatest(): HashWorldLine | undefined {
    if (this.state.history.length === 0) return undefined;
    const latestNode = this.state.history[this.state.history.length - 1];
    return this.moveTo(latestNode.worldStateHash);
  }

  /**
   * @deprecated Use moveTo instead. rewindTo will be removed in future versions.
   */
  rewindTo(worldStateHash: string): HashWorldLine | undefined {
    return this.moveTo(worldStateHash);
  }

  /**
   * 特定の履歴ノードを取得
   */
  getHistoryNode(worldStateHash: string): WorldHistoryNode | undefined {
    return this.state.history.find(
      (node) => node.worldStateHash === worldStateHash
    );
  }

  /**
   * 特定の状態までのDAG経路上にあるノードを取得（古い順）
   * @param worldStateHash 目標の状態ハッシュ
   * @returns 経路上のノード配列（ルートから目標まで）
   */
  getPathTo(worldStateHash: string): WorldHistoryNode[] {
    const pathNodes: WorldHistoryNode[] = [];
    let currentHash: string | undefined = worldStateHash;

    while (currentHash) {
      const node = this.state.history.find((n) => n.worldStateHash === currentHash);
      if (!node) break;
      pathNodes.unshift(node); // 先頭に追加（古い順にする）
      currentHash = node.parentWorldStateHash;
    }

    return pathNodes;
  }

  /**
   * 特定の状態時点での各オブジェクトの最新スナップショットを取得
   * DAG経路をたどり、各オブジェクトの最終状態を収集する
   * @param worldStateHash 目標の状態ハッシュ
   * @returns オブジェクトキー（type:id）からスナップショットへのMap
   */
  getSnapshotsAt(worldStateHash: string): Map<string, StateSnapshot> {
    const pathNodes = this.getPathTo(worldStateHash);
    const snapshots = new Map<string, StateSnapshot>();

    for (const node of pathNodes) {
      for (const changed of node.changedObjects) {
        // 後のノードで上書きされる可能性があるので、常に最新を保持
        const key = `${changed.type}:${changed.id}`;
        snapshots.set(key, changed);
      }
    }

    return snapshots;
  }

  /**
   * 名前を変更
   */
  rename(newName: string): HashWorldLine {
    return new HashWorldLine({
      ...this.state,
      name: newName,
    });
  }

  /**
   * 特定のノードの子ノードを取得
   */
  getChildNodes(worldStateHash: string): WorldHistoryNode[] {
    return this.state.history.filter(
      (node) => node.parentWorldStateHash === worldStateHash
    );
  }

  /**
   * ルートノード（親がないノード）を取得
   */
  getRootNodes(): WorldHistoryNode[] {
    return this.state.history.filter((node) => !node.parentWorldStateHash);
  }

  /**
   * 現在位置からルートまでの経路上にあるノードのハッシュセットを取得
   */
  getCurrentPath(): Set<string> {
    const path = new Set<string>();
    const currentNode = this.getCurrentHistoryNode();
    if (!currentNode) return path;

    let hash: string | undefined = currentNode.worldStateHash;
    while (hash) {
      path.add(hash);
      const node = this.getHistoryNode(hash);
      hash = node?.parentWorldStateHash;
    }
    return path;
  }

  /**
   * DAG構造をレイヤー（深さ）ごとに整理して返す
   * 分岐の視覚化に使用
   */
  getHistoryDAG(): HistoryDAGNode[] {
    if (this.state.history.length === 0) return [];

    // 各ノードの深さを計算
    const depthMap = new Map<string, number>();
    const branchMap = new Map<string, number>(); // 分岐番号

    // ルートから深さ優先で探索
    const calculateDepth = (hash: string, depth: number, branch: number) => {
      if (depthMap.has(hash)) return;
      depthMap.set(hash, depth);
      branchMap.set(hash, branch);

      const children = this.getChildNodes(hash);
      children.forEach((child, index) => {
        // 最初の子は同じ分岐、2番目以降は新しい分岐
        const childBranch = index === 0 ? branch : Math.max(...branchMap.values()) + 1;
        calculateDepth(child.worldStateHash, depth + 1, childBranch);
      });
    };

    // ルートノードから開始
    const roots = this.getRootNodes();
    roots.forEach((root, index) => {
      calculateDepth(root.worldStateHash, 0, index);
    });

    // 現在の経路を取得
    const currentPath = this.getCurrentPath();
    const currentNode = this.getCurrentHistoryNode();

    // DAGノードを構築
    return this.state.history.map((node) => ({
      node,
      depth: depthMap.get(node.worldStateHash) ?? 0,
      branch: branchMap.get(node.worldStateHash) ?? 0,
      isOnCurrentPath: currentPath.has(node.worldStateHash),
      isCurrent: node.worldStateHash === currentNode?.worldStateHash,
      children: this.getChildNodes(node.worldStateHash),
    }));
  }

  /**
   * JSON変換（シリアライズ）
   */
  toJson(): HashWorldLineJson {
    return {
      id: this.state.id,
      name: this.state.name,
      currentState: this.state.currentState.toJson(),
      history: this.state.history,
      currentHistoryIndex: this.state.currentHistoryIndex,
    };
  }

  /**
   * JSONから復元（デシリアライズ）
   */
  static fromJson(json: HashWorldLineJson): HashWorldLine {
    const history = json.history || [];
    // 後方互換性: currentHistoryIndex がない場合は最新を参照
    const currentHistoryIndex = json.currentHistoryIndex ?? (history.length - 1);

    return new HashWorldLine({
      id: json.id,
      name: json.name,
      currentState: WorldState.fromJson(json.currentState),
      history,
      currentHistoryIndex,
    });
  }
}

/**
 * HashWorldLine の JSON 表現
 */
export interface HashWorldLineJson {
  id: string;
  name: string;
  currentState: WorldStateJson;
  history: WorldHistoryNode[];
  currentHistoryIndex?: number;
}

/**
 * 世界全体の状態のハッシュを計算
 */
export async function computeWorldStateHash(
  worldState: WorldState
): Promise<string> {
  const snapshots = worldState.getAllSnapshots();
  // スナップショットをキーでソートして正規化
  const sorted = [...snapshots].sort((a, b) => {
    const keyA = `${a.type}:${a.id}`;
    const keyB = `${b.type}:${b.id}`;
    return keyA.localeCompare(keyB);
  });
  const normalized = normalizeJson(sorted);
  return await computeHash(normalized);
}
