import { WorldLineGraph } from '../domain/WorldLineGraph';
import { createStateRef } from '../domain/StateRef';
import { computeTreeLayout, TREE_HEIGHT } from './treeLayout';

describe('computeTreeLayout', () => {
  it('returns an empty layout for an empty graph', () => {
    const layout = computeTreeLayout(WorldLineGraph.empty());
    expect(layout.nodes.size).toBe(0);
    expect(layout.edges).toEqual([]);
    expect(layout.maxY).toBe(0);
  });

  it('places a single root node at depth 0, y = 0 (maxDepth = 0)', () => {
    const ref = createStateRef('counter', '1', 'hash0');
    const graph = WorldLineGraph.empty().grow([ref]);
    const layout = computeTreeLayout(graph);

    expect(layout.nodes.size).toBe(1);
    const rootId = graph.state.rootNodeId!;
    const rootLayout = layout.nodes.get(rootId)!;
    expect(rootLayout.depth).toBe(0);
    expect(rootLayout.y).toBe(0);
    expect(rootLayout.subtreeWidth).toBe(1);
    expect(rootLayout.isLeaf).toBe(true);
  });

  it('collapses a long unbranched chain down to just root + apex (no per-edit nodes)', () => {
    let graph = WorldLineGraph.empty().grow([createStateRef('counter', '1', 'h0')]);
    for (let i = 1; i <= 20; i++) {
      graph = graph.grow([createStateRef('counter', '1', `h${i}`)]);
    }
    const layout = computeTreeLayout(graph);
    const rootId = graph.state.rootNodeId!;
    const apexId = graph.state.apexNodeId!;

    // 20+ intermediate one-child nodes must NOT show up as separate tree nodes —
    // only the root and the current apex (also the leaf here) remain.
    expect(layout.nodes.size).toBe(2);
    expect(layout.nodes.has(rootId)).toBe(true);
    expect(layout.nodes.has(apexId)).toBe(true);
    // 21 nodes (root + 20 grows) -> 20 collapsed edits on the single reduced edge
    expect(layout.edges).toEqual([{ from: rootId, to: apexId, editCount: 20 }]);

    // height is capped to TREE_HEIGHT regardless of how many edits happened
    expect(layout.maxY).toBe(TREE_HEIGHT);
  });

  it('simple fork: root subtreeWidth sums children, children get distinct x', () => {
    const ref1 = createStateRef('counter', '1', 'hash1');
    const ref2 = createStateRef('counter', '1', 'hash2');
    const ref3 = createStateRef('counter', '1', 'hash3');

    // root -> childA, then move back and branch to childB
    const afterA = WorldLineGraph.empty().grow([ref1]).grow([ref2]);
    const childAId = afterA.state.apexNodeId!;
    const rootId = afterA.state.rootNodeId!;
    const branched = afterA.moveBack().grow([ref3]);
    const childBId = branched.state.apexNodeId!;

    const layout = computeTreeLayout(branched);

    expect(layout.nodes.size).toBe(3);
    const rootLayout = layout.nodes.get(rootId)!;
    const aLayout = layout.nodes.get(childAId)!;
    const bLayout = layout.nodes.get(childBId)!;

    expect(rootLayout.subtreeWidth).toBe(2);
    expect(aLayout.subtreeWidth).toBe(1);
    expect(bLayout.subtreeWidth).toBe(1);
    expect(aLayout.isLeaf).toBe(true);
    expect(bLayout.isLeaf).toBe(true);
    expect(rootLayout.isLeaf).toBe(false);

    // one grow each -> editCount of 1 per reduced edge
    const edgeToA = layout.edges.find((e) => e.to === childAId)!;
    const edgeToB = layout.edges.find((e) => e.to === childBId)!;
    expect(edgeToA.editCount).toBe(1);
    expect(edgeToB.editCount).toBe(1);

    // the two children must be spread apart, and the root centered between them
    expect(aLayout.x).not.toBe(bLayout.x);
    const [leftX, rightX] = aLayout.x < bLayout.x ? [aLayout.x, bLayout.x] : [bLayout.x, aLayout.x];
    expect(rootLayout.x).toBeCloseTo((leftX + rightX) / 2, 5);

    // both children are one (significant) generation past root
    expect(aLayout.depth).toBe(1);
    expect(bLayout.depth).toBe(1);
    expect(rootLayout.y).toBeGreaterThan(aLayout.y);

    // fixed tree height regardless of branch count
    expect(layout.maxY).toBe(TREE_HEIGHT);
  });

  it('a long single-line detour off a fork still collapses to one hop (structure over raw edit count)', () => {
    const ref1 = createStateRef('counter', '1', 'hash1');
    const ref2 = createStateRef('counter', '1', 'hash2');
    const ref3 = createStateRef('counter', '1', 'hash3');
    const ref4 = createStateRef('counter', '1', 'hash4');

    // root -> mid -> deepLeaf (a 2-edit detour with no further branching),
    // plus a sibling branch straight off root (1 edit, also no further branching).
    const deepLine = WorldLineGraph.empty().grow([ref1]).grow([ref2]).grow([ref3]);
    const deepLeafId = deepLine.state.apexNodeId!;
    const rootId = deepLine.state.rootNodeId!;
    const branched = deepLine.moveTo(rootId).grow([ref4]);
    const shallowLeafId = branched.state.apexNodeId!;

    const layout = computeTreeLayout(branched);

    // "mid" (the intermediate one-child node on the deep line) is compressed away —
    // only root + the two leaves survive as significant nodes.
    expect(layout.nodes.size).toBe(3);

    const deepLeafLayout = layout.nodes.get(deepLeafId)!;
    const shallowLeafLayout = layout.nodes.get(shallowLeafId)!;
    const rootLayout = layout.nodes.get(rootId)!;

    // neither leaf branches further, so both sit at the same significant depth —
    // the extra raw edit on the deep line doesn't buy it extra height, only the
    // *decision structure* (branch points) determines vertical position.
    expect(deepLeafLayout.depth).toBe(1);
    expect(shallowLeafLayout.depth).toBe(1);
    expect(deepLeafLayout.y).toBe(shallowLeafLayout.y);
    expect(rootLayout.subtreeWidth).toBe(2);

    // ...but editCount still reflects the raw edit volume collapsed into each
    // branch, so the heavily-edited detour can render as a thicker "trunk"
    // even though it doesn't out-rank its sibling structurally.
    const edgeToDeep = layout.edges.find((e) => e.to === deepLeafId)!;
    const edgeToShallow = layout.edges.find((e) => e.to === shallowLeafId)!;
    expect(edgeToDeep.editCount).toBe(2);
    expect(edgeToShallow.editCount).toBe(1);
  });

  it('keeps a single fixed tree height whether there are few or many branch levels', () => {
    // shallow: a single fork straight off root
    const shallow = WorldLineGraph.empty()
      .grow([createStateRef('c', '1', 'a')])
      .grow([createStateRef('c', '1', 'b')]);
    const shallowRoot = shallow.state.rootNodeId!;
    const shallowBranched = shallow.moveTo(shallowRoot).grow([createStateRef('c', '1', 'c')]);

    // deep: several nested branch levels (branch, then branch again inside one side)
    let deep = WorldLineGraph.empty().grow([createStateRef('c', '1', '1')]);
    const deepRoot = deep.state.rootNodeId!;
    deep = deep.grow([createStateRef('c', '1', '2')]);
    const level1 = deep.state.apexNodeId!;
    deep = deep.moveTo(deepRoot).grow([createStateRef('c', '1', '3')]); // fork at root
    deep = deep.moveTo(level1).grow([createStateRef('c', '1', '4')]);
    const level2 = deep.state.apexNodeId!;
    deep = deep.moveTo(level1).grow([createStateRef('c', '1', '5')]); // fork at level1

    const shallowLayout = computeTreeLayout(shallowBranched);
    const deepLayout = computeTreeLayout(deep);

    expect(shallowLayout.maxY).toBe(TREE_HEIGHT);
    expect(deepLayout.maxY).toBe(TREE_HEIGHT);
    expect(level2).toBeTruthy();
  });
});
