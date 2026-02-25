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
