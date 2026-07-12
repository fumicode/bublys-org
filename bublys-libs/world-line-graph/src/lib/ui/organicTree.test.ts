import { TreeLayout, TreeNodeLayout, TreeEdge } from './treeLayout';
import { computeOrganicTree, DEFAULT_ORGANIC_TREE_OPTIONS } from './organicTree';

function makeLayout(
  nodes: Record<string, Partial<TreeNodeLayout> & { x: number; y: number }>,
  edges: TreeEdge[]
): TreeLayout {
  const nodeMap = new Map<string, TreeNodeLayout>();
  for (const [id, n] of Object.entries(nodes)) {
    nodeMap.set(id, {
      x: n.x,
      y: n.y,
      depth: n.depth ?? 0,
      subtreeWidth: n.subtreeWidth ?? 1,
      isLeaf: n.isLeaf ?? true,
      color: n.color ?? '#888',
    });
  }
  const xs = Array.from(nodeMap.values()).map((n) => n.x);
  const ys = Array.from(nodeMap.values()).map((n) => n.y);
  return {
    nodes: nodeMap,
    edges,
    minX: xs.length ? Math.min(...xs) : 0,
    maxX: xs.length ? Math.max(...xs) : 0,
    maxY: ys.length ? Math.max(...ys) : 0,
  };
}

describe('computeOrganicTree', () => {
  it('returns an empty organic tree for an empty layout', () => {
    const empty: TreeLayout = { nodes: new Map(), edges: [], minX: 0, maxX: 0, maxY: 0 };
    const organic = computeOrganicTree(empty, null, new Map());

    expect(organic.edges).toEqual([]);
    expect(organic.leaves).toEqual([]);
    expect(organic.apex).toBeNull();
    expect(organic.totalDurationMs).toBe(DEFAULT_ORGANIC_TREE_OPTIONS.totalDurationMs);
  });

  it('is deterministic: same layout + timestamps produce identical output on repeat calls', () => {
    const layout = makeLayout(
      { root: { x: 0, y: 100, subtreeWidth: 2, isLeaf: false }, a: { x: -20, y: 0 }, b: { x: 20, y: 0 } },
      [
        { from: 'root', to: 'a', editCount: 1 },
        { from: 'root', to: 'b', editCount: 2 },
      ]
    );
    const timestamps = new Map([
      ['root', 1000],
      ['a', 2000],
      ['b', 3000],
    ]);

    const first = computeOrganicTree(layout, 'b', timestamps);
    const second = computeOrganicTree(layout, 'b', timestamps);

    expect(second).toEqual(first);
  });

  it('gives different edges different jittered geometry (not a constant curve)', () => {
    const layout = makeLayout(
      { root: { x: 0, y: 100, subtreeWidth: 2, isLeaf: false }, a: { x: -20, y: 0 }, b: { x: 20, y: 0 } },
      [
        { from: 'root', to: 'a', editCount: 1 },
        { from: 'root', to: 'b', editCount: 1 },
      ]
    );
    const organic = computeOrganicTree(layout, 'b', new Map());
    const edgeToA = organic.edges.find((e) => e.to === 'a')!;
    const edgeToB = organic.edges.find((e) => e.to === 'b')!;

    expect(edgeToA.centerlinePath).not.toBe(edgeToB.centerlinePath);
  });

  it('tapers width from the from-side to the to-side when taperRatio < 1', () => {
    const layout = makeLayout(
      { root: { x: 0, y: 100, subtreeWidth: 1, isLeaf: false }, leaf: { x: 0, y: 0 } },
      [{ from: 'root', to: 'leaf', editCount: 1 }]
    );
    const organic = computeOrganicTree(layout, 'leaf', new Map(), { taperRatio: 0.6 });
    const edge = organic.edges[0];

    expect(edge.widthTo).toBeLessThan(edge.widthFrom);
    expect(edge.widthTo).toBeCloseTo(edge.widthFrom * 0.6, 5);
  });

  it('assigns non-decreasing delay as the to-node timestamp increases (growth order)', () => {
    const layout = makeLayout(
      {
        root: { x: 0, y: 100, subtreeWidth: 3, isLeaf: false },
        early: { x: -20, y: 0 },
        mid: { x: 0, y: 0 },
        late: { x: 20, y: 0 },
      },
      [
        { from: 'root', to: 'late', editCount: 1 },
        { from: 'root', to: 'early', editCount: 1 },
        { from: 'root', to: 'mid', editCount: 1 },
      ]
    );
    const timestamps = new Map([
      ['root', 0],
      ['early', 100],
      ['mid', 200],
      ['late', 300],
    ]);

    const organic = computeOrganicTree(layout, 'late', timestamps);
    const byTo = new Map(organic.edges.map((e) => [e.to, e]));

    expect(byTo.get('early')!.delayMs).toBeLessThanOrEqual(byTo.get('mid')!.delayMs);
    expect(byTo.get('mid')!.delayMs).toBeLessThanOrEqual(byTo.get('late')!.delayMs);
  });

  it('always finishes within totalDurationMs regardless of how many edges there are', () => {
    const nodes: Record<string, Partial<TreeNodeLayout> & { x: number; y: number }> = {
      root: { x: 0, y: 100, subtreeWidth: 50, isLeaf: false },
    };
    const edges: TreeEdge[] = [];
    const timestamps = new Map<string, number>([['root', 0]]);
    for (let i = 0; i < 50; i++) {
      const id = `leaf${i}`;
      nodes[id] = { x: i, y: 0 };
      edges.push({ from: 'root', to: id, editCount: 1 });
      timestamps.set(id, i * 10);
    }
    const layout = makeLayout(nodes, edges);

    const organic = computeOrganicTree(layout, 'leaf49', timestamps);
    const maxFinish = Math.max(...organic.edges.map((e) => e.delayMs + e.durationMs));

    expect(maxFinish).toBeLessThanOrEqual(DEFAULT_ORGANIC_TREE_OPTIONS.totalDurationMs);

    // a much smaller tree should hit the same cap, not scale down further
    const smallLayout = makeLayout(
      { root: { x: 0, y: 100, subtreeWidth: 2, isLeaf: false }, a: { x: -10, y: 0 }, b: { x: 10, y: 0 } },
      [
        { from: 'root', to: 'a', editCount: 1 },
        { from: 'root', to: 'b', editCount: 1 },
      ]
    );
    const smallOrganic = computeOrganicTree(smallLayout, 'b', new Map([['root', 0], ['a', 1], ['b', 2]]));
    const smallMaxFinish = Math.max(...smallOrganic.edges.map((e) => e.delayMs + e.durationMs));
    expect(smallMaxFinish).toBeLessThanOrEqual(DEFAULT_ORGANIC_TREE_OPTIONS.totalDurationMs);
  });

  it('gives leaf blooms that are stable for the same node id', () => {
    const layout = makeLayout(
      { root: { x: 0, y: 100, subtreeWidth: 1, isLeaf: false }, leaf: { x: 0, y: 0 } },
      [{ from: 'root', to: 'leaf', editCount: 1 }]
    );
    const first = computeOrganicTree(layout, 'leaf', new Map());
    const second = computeOrganicTree(layout, 'leaf', new Map());

    expect(first.leaves).toEqual(second.leaves);
    const bloom = first.leaves.find((l) => l.nodeId === 'leaf')!;
    expect(bloom.petals.length).toBeGreaterThanOrEqual(3);
    expect(bloom.petals.length).toBeLessThanOrEqual(5);
  });

  it('reveals the apex right as its incoming edge finishes, and at 0 for a root-only tree', () => {
    const layout = makeLayout(
      { root: { x: 0, y: 100, subtreeWidth: 1, isLeaf: false }, leaf: { x: 0, y: 0 } },
      [{ from: 'root', to: 'leaf', editCount: 1 }]
    );
    const organic = computeOrganicTree(layout, 'leaf', new Map([['root', 0], ['leaf', 100]]));
    const edge = organic.edges[0];

    expect(organic.apex!.revealAtMs).toBe(edge.delayMs + edge.durationMs);

    const singleLayout = makeLayout({ root: { x: 0, y: 0, isLeaf: true } }, []);
    const singleOrganic = computeOrganicTree(singleLayout, 'root', new Map([['root', 0]]));
    expect(singleOrganic.apex!.revealAtMs).toBe(0);
  });
});
