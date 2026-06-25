import { WorldLineGraph } from './WorldLineGraph';
import { createStateRef, stateRefKey } from './StateRef';

describe('WorldLineGraph', () => {
  describe('empty()', () => {
    it('creates a graph with no nodes', () => {
      const graph = WorldLineGraph.empty();
      expect(graph.state.nodes).toEqual({});
      expect(graph.state.apexNodeId).toBeNull();
      expect(graph.state.rootNodeId).toBeNull();
    });
  });

  describe('grow()', () => {
    it('first grow creates the root node', () => {
      const ref = createStateRef('counter', '1', 'abc123');
      const graph = WorldLineGraph.empty().grow([ref]);

      expect(graph.state.rootNodeId).not.toBeNull();
      expect(graph.state.apexNodeId).toBe(graph.state.rootNodeId);

      const rootNode = graph.state.nodes[graph.state.rootNodeId!];
      expect(rootNode.parentId).toBeNull();
      expect(rootNode.changedRefs).toEqual([ref]);
    });

    it('subsequent grows chain from apex', () => {
      const ref1 = createStateRef('counter', '1', 'hash1');
      const ref2 = createStateRef('counter', '1', 'hash2');

      const graph = WorldLineGraph.empty().grow([ref1]).grow([ref2]);

      const rootNode = graph.state.nodes[graph.state.rootNodeId!];
      const apexNode = graph.state.nodes[graph.state.apexNodeId!];

      expect(apexNode.parentId).toBe(rootNode.id);
      expect(apexNode.changedRefs).toEqual([ref2]);
    });

    it('grow from apex with no children keeps same worldLineId', () => {
      const ref1 = createStateRef('counter', '1', 'hash1');
      const ref2 = createStateRef('counter', '1', 'hash2');

      const graph = WorldLineGraph.empty().grow([ref1]).grow([ref2]);

      const rootNode = graph.state.nodes[graph.state.rootNodeId!];
      const apexNode = graph.state.nodes[graph.state.apexNodeId!];

      expect(apexNode.worldLineId).toBe(rootNode.worldLineId);
    });

    it('grow from apex with children creates a branch (new worldLineId)', () => {
      const ref1 = createStateRef('counter', '1', 'hash1');
      const ref2 = createStateRef('counter', '1', 'hash2');
      const ref3 = createStateRef('counter', '1', 'hash3');

      // Create root -> child1, then move back and branch
      const afterTwo = WorldLineGraph.empty().grow([ref1]).grow([ref2]);
      const movedBack = afterTwo.moveBack();
      const branched = movedBack.grow([ref3]);

      const rootNode = branched.state.nodes[branched.state.rootNodeId!];
      const branchNode = branched.state.nodes[branched.state.apexNodeId!];

      expect(branchNode.parentId).toBe(rootNode.id);
      expect(branchNode.worldLineId).not.toBe(rootNode.worldLineId);
    });
  });

  describe('grow() 打ち消しスナップ', () => {
    it('操作→打ち消しで元状態に戻ると、新ノードを作らず親へ戻る（枝だけ残る）', () => {
      const s0 = createStateRef('counter', '1', 'hash0');
      const s1 = createStateRef('counter', '1', 'hash1');

      const base = WorldLineGraph.empty().grow([s0]); // 初期状態 S0
      const rootId = base.state.rootNodeId!;
      const edited = base.grow([s1]); // 操作: S0 -> S1
      const editedApexId = edited.state.apexNodeId!;

      // 打ち消し: S1 -> S0（root と同じ状態に戻る）
      const undone = edited.grow([s0]);

      // apex は root に戻り、新ノードは増えていない
      expect(undone.state.apexNodeId).toBe(rootId);
      expect(Object.keys(undone.state.nodes)).toHaveLength(2);
      // 伸びた枝 S1 は子として残る
      expect(undone.getChildrenMap()[rootId]).toEqual([editedApexId]);
    });

    it('複数オブジェクトのうち全体が一致して初めて戻る（途中の別変更があれば伸びる）', () => {
      const a0 = createStateRef('counter', 'a', 'a0');
      const a1 = createStateRef('counter', 'a', 'a1');
      const b1 = createStateRef('memo', 'b', 'b1');

      const base = WorldLineGraph.empty().grow([a0]); // {a:a0}
      const g1 = base.grow([a1]); // {a:a1}
      const g2 = g1.grow([b1]); // {a:a1, b:b1}

      // a を a0 に戻しても、b:b1 が残っているので全体は過去のどれとも一致しない → 伸びる
      const g3 = g2.grow([a0]); // {a:a0, b:b1}
      expect(Object.keys(g3.state.nodes)).toHaveLength(4);
      expect(g3.state.apexNodeId).not.toBe(base.state.rootNodeId);
    });

    it('打ち消した操作をやり直すと、重複ノードを作らず既存の子の枝へ合流（前進）する', () => {
      const s0 = createStateRef('counter', '1', 'hash0');
      const s1 = createStateRef('counter', '1', 'hash1');

      const base = WorldLineGraph.empty().grow([s0]); // S0
      const rootId = base.state.rootNodeId!;
      const edited = base.grow([s1]); // 操作: S0 -> S1（枝 N1 = S1）
      const n1Id = edited.state.apexNodeId!;
      const undone = edited.grow([s0]); // 打ち消し: apex は root(S0) に戻る
      expect(undone.state.apexNodeId).toBe(rootId);

      // 同じ操作をやり直す: S0 -> S1。既存の子 N1 と同じ状態 → N1 へ前進
      const redone = undone.grow([s1]);

      expect(redone.state.apexNodeId).toBe(n1Id);
      expect(Object.keys(redone.state.nodes)).toHaveLength(2); // 重複ノードは増えない
    });

    it('子が居ても状態が違えば合流せず、新しい枝として伸びる', () => {
      const s0 = createStateRef('counter', '1', 'hash0');
      const s1 = createStateRef('counter', '1', 'hash1');
      const s2 = createStateRef('counter', '1', 'hash2');

      const base = WorldLineGraph.empty().grow([s0]); // S0
      const rootId = base.state.rootNodeId!;
      const withChild = base.grow([s1]); // 子 N1 = S1
      const atRoot = withChild.moveTo(rootId);

      // S0 -> S2。子 N1 は S1 なので一致せず → 新しい枝
      const branched = atRoot.grow([s2]);
      expect(Object.keys(branched.state.nodes)).toHaveLength(3);
      expect(branched.state.nodes[branched.state.apexNodeId!].parentId).toBe(rootId);
    });

    it('stateHash を持たない旧データでもフォールバック計算でスナップする', () => {
      const s0 = createStateRef('counter', '1', 'hash0');
      const s1 = createStateRef('counter', '1', 'hash1');

      const built = WorldLineGraph.empty().grow([s0]).grow([s1]);
      const rootId = built.state.rootNodeId!;

      // 旧データを模して全ノードから stateHash を剥がす
      const legacyNodes: Record<string, typeof built.state.nodes[string]> = {};
      for (const [id, node] of Object.entries(built.state.nodes)) {
        const { stateHash: _drop, ...rest } = node;
        legacyNodes[id] = rest;
      }
      const legacy = new WorldLineGraph({ ...built.state, nodes: legacyNodes });

      // 打ち消し: S1 -> S0。stateHash が無くても root(S0) に戻れる
      const undone = legacy.grow([s0]);
      expect(undone.state.apexNodeId).toBe(rootId);
      expect(Object.keys(undone.state.nodes)).toHaveLength(2);
    });

    it('状態が変わらない no-op 保存は新ノードを作らない', () => {
      const s0 = createStateRef('counter', '1', 'hash0');
      const base = WorldLineGraph.empty().grow([s0]);
      const apexId = base.state.apexNodeId!;

      const again = base.grow([s0]); // 同じ状態を保存

      expect(again.state.apexNodeId).toBe(apexId);
      expect(Object.keys(again.state.nodes)).toHaveLength(1);
    });
  });

  describe('moveTo()', () => {
    it('moves apex to specified node', () => {
      const ref1 = createStateRef('counter', '1', 'hash1');
      const ref2 = createStateRef('counter', '1', 'hash2');

      const graph = WorldLineGraph.empty().grow([ref1]).grow([ref2]);
      const rootId = graph.state.rootNodeId!;

      const moved = graph.moveTo(rootId);
      expect(moved.state.apexNodeId).toBe(rootId);
    });

    it('throws on invalid nodeId', () => {
      const graph = WorldLineGraph.empty();
      expect(() => graph.moveTo('nonexistent')).toThrow('Node not found');
    });
  });

  describe('moveBack()', () => {
    it('moves apex to parent', () => {
      const ref1 = createStateRef('counter', '1', 'hash1');
      const ref2 = createStateRef('counter', '1', 'hash2');

      const graph = WorldLineGraph.empty().grow([ref1]).grow([ref2]);
      const moved = graph.moveBack();

      expect(moved.state.apexNodeId).toBe(graph.state.rootNodeId);
    });

    it('returns same graph when at root', () => {
      const ref = createStateRef('counter', '1', 'hash1');
      const graph = WorldLineGraph.empty().grow([ref]);
      const moved = graph.moveBack();

      expect(moved.state.apexNodeId).toBe(graph.state.apexNodeId);
    });

    it('returns same graph when empty', () => {
      const graph = WorldLineGraph.empty();
      const moved = graph.moveBack();
      expect(moved).toBe(graph);
    });
  });

  describe('moveForward()', () => {
    it('follows child with same worldLineId', () => {
      const ref1 = createStateRef('counter', '1', 'hash1');
      const ref2 = createStateRef('counter', '1', 'hash2');

      const graph = WorldLineGraph.empty().grow([ref1]).grow([ref2]);
      const apexId = graph.state.apexNodeId!;

      const movedBack = graph.moveBack();
      const movedForward = movedBack.moveForward();

      expect(movedForward.state.apexNodeId).toBe(apexId);
    });

    it('returns same graph when at leaf', () => {
      const ref = createStateRef('counter', '1', 'hash1');
      const graph = WorldLineGraph.empty().grow([ref]);
      const moved = graph.moveForward();

      expect(moved.state.apexNodeId).toBe(graph.state.apexNodeId);
    });

    it('returns same graph when empty', () => {
      const graph = WorldLineGraph.empty();
      const moved = graph.moveForward();
      expect(moved).toBe(graph);
    });
  });

  describe('getStateRefsAt()', () => {
    it('accumulates changedRefs along root->node path (last wins)', () => {
      const refA1 = createStateRef('counter', 'a', 'hash1');
      const refB1 = createStateRef('memo', 'b', 'hash2');
      const refA2 = createStateRef('counter', 'a', 'hash3');

      const graph = WorldLineGraph.empty()
        .grow([refA1, refB1])
        .grow([refA2]);

      const refs = graph.getStateRefsAt(graph.state.apexNodeId!);

      const refMap = new Map(refs.map((r) => [stateRefKey(r), r]));
      expect(refMap.get('counter:a')?.hash).toBe('hash3');
      expect(refMap.get('memo:b')?.hash).toBe('hash2');
      expect(refs.length).toBe(2);
    });

    it('returns changedRefs for root node', () => {
      const ref = createStateRef('counter', '1', 'hash1');
      const graph = WorldLineGraph.empty().grow([ref]);

      const refs = graph.getStateRefsAt(graph.state.rootNodeId!);
      expect(refs).toEqual([ref]);
    });
  });

  describe('getCurrentStateRefs()', () => {
    it('returns empty array when graph is empty', () => {
      const graph = WorldLineGraph.empty();
      expect(graph.getCurrentStateRefs()).toEqual([]);
    });

    it('returns state refs at apex', () => {
      const ref = createStateRef('counter', '1', 'hash1');
      const graph = WorldLineGraph.empty().grow([ref]);
      expect(graph.getCurrentStateRefs()).toEqual([ref]);
    });
  });

  describe('getChildrenMap()', () => {
    it('returns correct parent-children mapping', () => {
      const ref1 = createStateRef('counter', '1', 'hash1');
      const ref2 = createStateRef('counter', '1', 'hash2');
      const ref3 = createStateRef('counter', '1', 'hash3');

      // root -> child1, root -> child2 (branch)
      const afterTwo = WorldLineGraph.empty().grow([ref1]).grow([ref2]);
      const movedBack = afterTwo.moveBack();
      const branched = movedBack.grow([ref3]);

      const childrenMap = branched.getChildrenMap();
      const rootId = branched.state.rootNodeId!;

      expect(childrenMap[rootId]).toHaveLength(2);
    });

    it('returns empty map for empty graph', () => {
      const graph = WorldLineGraph.empty();
      expect(graph.getChildrenMap()).toEqual({});
    });
  });

  describe('getPathToNode()', () => {
    it('returns path from root to node', () => {
      const ref1 = createStateRef('counter', '1', 'hash1');
      const ref2 = createStateRef('counter', '1', 'hash2');
      const ref3 = createStateRef('counter', '1', 'hash3');

      const graph = WorldLineGraph.empty()
        .grow([ref1])
        .grow([ref2])
        .grow([ref3]);

      const path = graph.getPathToNode(graph.state.apexNodeId!);
      expect(path).toHaveLength(3);
      expect(path[0].id).toBe(graph.state.rootNodeId);
      expect(path[2].id).toBe(graph.state.apexNodeId);
    });
  });

  describe('toJSON() / fromJSON()', () => {
    it('roundtrips correctly', () => {
      const ref1 = createStateRef('counter', '1', 'hash1');
      const ref2 = createStateRef('memo', '2', 'hash2');

      const graph = WorldLineGraph.empty().grow([ref1]).grow([ref2]);

      const json = graph.toJSON();
      const restored = WorldLineGraph.fromJSON(json);

      expect(restored.state.nodes).toEqual(graph.state.nodes);
      expect(restored.state.apexNodeId).toBe(graph.state.apexNodeId);
      expect(restored.state.rootNodeId).toBe(graph.state.rootNodeId);
    });

    it('roundtrips empty graph', () => {
      const graph = WorldLineGraph.empty();
      const json = graph.toJSON();
      const restored = WorldLineGraph.fromJSON(json);

      expect(restored.state).toEqual(graph.state);
    });
  });
});
