import type { WorldNode } from "@bublys-org/world-line-graph";

export type FoldLevel = "command" | "step" | "cell";

export type FoldState = {
  readonly levels: ReadonlyMap<string, FoldLevel>;
  readonly defaultLevel: FoldLevel;
};

export type FoldGroupInfo = {
  readonly commandGroupId: string;
  readonly nodeCount: number;
  readonly intentLabel?: string;
};

export function createDefaultFoldState(
  defaultLevel: FoldLevel = "command"
): FoldState {
  return { levels: new Map(), defaultLevel };
}

export function getFoldLevel(
  state: FoldState,
  commandGroupId: string
): FoldLevel {
  return state.levels.get(commandGroupId) ?? state.defaultLevel;
}

export function toggleFold(
  state: FoldState,
  commandGroupId: string
): FoldState {
  const current = getFoldLevel(state, commandGroupId);
  const next: FoldLevel =
    current === "command" ? "step" : current === "step" ? "cell" : "command";
  const levels = new Map(state.levels);
  levels.set(commandGroupId, next);
  return { ...state, levels };
}

export function foldAll(state: FoldState): FoldState {
  return { ...state, levels: new Map() };
}

export type FoldedGraphData = {
  readonly visibleNodeIds: Set<string>;
  readonly nodeToRepresentative: ReadonlyMap<string, string>;
  readonly groupInfoByRepId: ReadonlyMap<string, FoldGroupInfo>;
};

export function buildFoldedGraphData(
  nodes: Record<string, WorldNode>,
  childrenMap: Record<string, string[]>,
  foldState: FoldState
): FoldedGraphData {
  const nodeToRepresentative = new Map<string, string>();
  const groupInfoByRepId = new Map<string, FoldGroupInfo>();

  const groups = new Map<string, WorldNode[]>();
  for (const node of Object.values(nodes)) {
    if (node.commandGroupId) {
      const list = groups.get(node.commandGroupId) ?? [];
      list.push(node);
      groups.set(node.commandGroupId, list);
    }
  }

  for (const [groupId, groupNodes] of groups) {
    const level = getFoldLevel(foldState, groupId);
    if (level === "cell") continue;

    const sorted = [...groupNodes].sort((a, b) => a.timestamp - b.timestamp);

    if (level === "command") {
      const representative = sorted[sorted.length - 1];
      for (const n of sorted) {
        if (n.id !== representative.id) {
          nodeToRepresentative.set(n.id, representative.id);
        }
      }
      groupInfoByRepId.set(representative.id, {
        commandGroupId: groupId,
        nodeCount: groupNodes.length,
        intentLabel: sorted.find((n) => n.intentLabel)?.intentLabel,
      });
    } else if (level === "step") {
      const byStep = new Map<number, WorldNode[]>();
      for (const n of sorted) {
        const step = n.commandStepIndex ?? 0;
        const list = byStep.get(step) ?? [];
        list.push(n);
        byStep.set(step, list);
      }
      for (const [, stepNodes] of byStep) {
        if (stepNodes.length <= 1) continue;
        const stepSorted = [...stepNodes].sort(
          (a, b) => a.timestamp - b.timestamp
        );
        const representative = stepSorted[stepSorted.length - 1];
        for (const n of stepSorted) {
          if (n.id !== representative.id) {
            nodeToRepresentative.set(n.id, representative.id);
          }
        }
        groupInfoByRepId.set(representative.id, {
          commandGroupId: groupId,
          nodeCount: stepNodes.length,
          intentLabel: stepSorted.find((n) => n.intentLabel)?.intentLabel,
        });
      }
    }
  }

  const visibleNodeIds = new Set<string>();
  for (const id of Object.keys(nodes)) {
    if (!nodeToRepresentative.has(id)) {
      visibleNodeIds.add(id);
    }
  }

  return { visibleNodeIds, nodeToRepresentative, groupInfoByRepId };
}

export function buildFoldedChildrenMap(
  childrenMap: Record<string, string[]>,
  foldedData: FoldedGraphData
): Record<string, string[]> {
  const { visibleNodeIds, nodeToRepresentative } = foldedData;
  const resolve = (id: string) => nodeToRepresentative.get(id) ?? id;

  const result: Record<string, string[]> = {};
  for (const [parentId, children] of Object.entries(childrenMap)) {
    const resolvedParent = resolve(parentId);
    if (!visibleNodeIds.has(resolvedParent)) continue;

    const resolvedChildren = [
      ...new Set(
        children
          .map(resolve)
          .filter((id) => id !== resolvedParent && visibleNodeIds.has(id))
      ),
    ];

    if (resolvedChildren.length > 0) {
      const existing = result[resolvedParent] ?? [];
      result[resolvedParent] = [
        ...new Set([...existing, ...resolvedChildren]),
      ];
    }
  }

  return result;
}
