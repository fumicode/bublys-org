import { describe, it, expect } from "vitest";
import type { WorldNode } from "@bublys-org/world-line-graph";
import {
  createDefaultFoldState,
  getFoldLevel,
  toggleFold,
  foldAll,
  buildFoldedGraphData,
  buildFoldedChildrenMap,
} from "./commandFold";

function node(
  id: string,
  parentId: string | null,
  worldLineId: string,
  opts?: Partial<WorldNode>
): WorldNode {
  return {
    id,
    parentId,
    timestamp: parseInt(id.replace(/\D/g, ""), 10) || 0,
    changedRefs: [],
    worldLineId,
    ...opts,
  };
}

describe("FoldState", () => {
  it("defaults to command level", () => {
    const s = createDefaultFoldState();
    expect(getFoldLevel(s, "g1")).toBe("command");
  });

  it("toggles command → step → cell → command", () => {
    let s = createDefaultFoldState();
    s = toggleFold(s, "g1");
    expect(getFoldLevel(s, "g1")).toBe("step");
    s = toggleFold(s, "g1");
    expect(getFoldLevel(s, "g1")).toBe("cell");
    s = toggleFold(s, "g1");
    expect(getFoldLevel(s, "g1")).toBe("command");
  });

  it("foldAll resets all groups to default", () => {
    let s = createDefaultFoldState();
    s = toggleFold(s, "g1");
    s = toggleFold(s, "g2");
    s = foldAll(s);
    expect(getFoldLevel(s, "g1")).toBe("command");
    expect(getFoldLevel(s, "g2")).toBe("command");
  });
});

describe("buildFoldedGraphData", () => {
  const nodes: Record<string, WorldNode> = {
    root: node("root", null, "wl1"),
    a1: node("a1", "root", "wl1", {
      commandGroupId: "cmd1",
      commandStepIndex: 0,
      intentLabel: "希望を叶える",
      timestamp: 10,
    }),
    a2: node("a2", "a1", "wl1", {
      commandGroupId: "cmd1",
      commandStepIndex: 0,
      timestamp: 20,
    }),
    a3: node("a3", "a2", "wl1", {
      commandGroupId: "cmd1",
      commandStepIndex: 1,
      intentLabel: "責任者を配置",
      timestamp: 30,
    }),
    a4: node("a4", "a3", "wl1", {
      commandGroupId: "cmd1",
      commandStepIndex: 1,
      timestamp: 40,
    }),
    result: node("result", "a4", "wl1", { timestamp: 50 }),
  };

  const childrenMap: Record<string, string[]> = {
    root: ["a1"],
    a1: ["a2"],
    a2: ["a3"],
    a3: ["a4"],
    a4: ["result"],
  };

  it("command level: collapses entire group to last node", () => {
    const foldState = createDefaultFoldState("command");
    const data = buildFoldedGraphData(nodes, childrenMap, foldState);

    expect(data.visibleNodeIds).toContain("root");
    expect(data.visibleNodeIds).toContain("a4");
    expect(data.visibleNodeIds).toContain("result");
    expect(data.visibleNodeIds).not.toContain("a1");
    expect(data.visibleNodeIds).not.toContain("a2");
    expect(data.visibleNodeIds).not.toContain("a3");

    expect(data.nodeToRepresentative.get("a1")).toBe("a4");
    expect(data.nodeToRepresentative.get("a2")).toBe("a4");
    expect(data.nodeToRepresentative.get("a3")).toBe("a4");

    const info = data.groupInfoByRepId.get("a4");
    expect(info).toBeDefined();
    expect(info!.nodeCount).toBe(4);
    expect(info!.intentLabel).toBe("希望を叶える");
  });

  it("step level: collapses within each step", () => {
    let foldState = createDefaultFoldState("command");
    foldState = toggleFold(foldState, "cmd1");
    const data = buildFoldedGraphData(nodes, childrenMap, foldState);

    // step 0: a1, a2 → representative a2
    // step 1: a3, a4 → representative a4
    expect(data.visibleNodeIds).toContain("root");
    expect(data.visibleNodeIds).toContain("a2");
    expect(data.visibleNodeIds).toContain("a4");
    expect(data.visibleNodeIds).toContain("result");
    expect(data.visibleNodeIds).not.toContain("a1");
    expect(data.visibleNodeIds).not.toContain("a3");

    expect(data.nodeToRepresentative.get("a1")).toBe("a2");
    expect(data.nodeToRepresentative.get("a3")).toBe("a4");

    expect(data.groupInfoByRepId.get("a2")!.nodeCount).toBe(2);
    expect(data.groupInfoByRepId.get("a4")!.nodeCount).toBe(2);
  });

  it("cell level: all nodes visible", () => {
    let foldState = createDefaultFoldState("command");
    foldState = toggleFold(foldState, "cmd1");
    foldState = toggleFold(foldState, "cmd1");
    const data = buildFoldedGraphData(nodes, childrenMap, foldState);

    expect(data.visibleNodeIds.size).toBe(Object.keys(nodes).length);
    expect(data.nodeToRepresentative.size).toBe(0);
    expect(data.groupInfoByRepId.size).toBe(0);
  });
});

describe("buildFoldedChildrenMap", () => {
  it("rewires edges to skip folded nodes", () => {
    const nodes: Record<string, WorldNode> = {
      root: node("root", null, "wl1"),
      a1: node("a1", "root", "wl1", {
        commandGroupId: "cmd1",
        commandStepIndex: 0,
        timestamp: 10,
      }),
      a2: node("a2", "a1", "wl1", {
        commandGroupId: "cmd1",
        commandStepIndex: 0,
        timestamp: 20,
      }),
      tip: node("tip", "a2", "wl1", { timestamp: 30 }),
    };
    const childrenMap: Record<string, string[]> = {
      root: ["a1"],
      a1: ["a2"],
      a2: ["tip"],
    };

    const foldState = createDefaultFoldState("command");
    const data = buildFoldedGraphData(nodes, childrenMap, foldState);
    const folded = buildFoldedChildrenMap(childrenMap, data);

    expect(folded["root"]).toEqual(["a2"]);
    expect(folded["a2"]).toEqual(["tip"]);
    expect(folded["a1"]).toBeUndefined();
  });

  it("handles branching with separate command groups", () => {
    const nodes: Record<string, WorldNode> = {
      root: node("root", null, "wl1"),
      b1: node("b1", "root", "wl1", {
        commandGroupId: "cmd-a",
        timestamp: 10,
      }),
      b2: node("b2", "b1", "wl1", {
        commandGroupId: "cmd-a",
        timestamp: 20,
      }),
      c1: node("c1", "root", "wl2", {
        commandGroupId: "cmd-b",
        timestamp: 10,
      }),
      c2: node("c2", "c1", "wl2", {
        commandGroupId: "cmd-b",
        timestamp: 20,
      }),
    };
    const childrenMap: Record<string, string[]> = {
      root: ["b1", "c1"],
      b1: ["b2"],
      c1: ["c2"],
    };

    const foldState = createDefaultFoldState("command");
    const data = buildFoldedGraphData(nodes, childrenMap, foldState);
    const folded = buildFoldedChildrenMap(childrenMap, data);

    expect(folded["root"]).toEqual(expect.arrayContaining(["b2", "c2"]));
    expect(folded["root"]!.length).toBe(2);
  });
});
