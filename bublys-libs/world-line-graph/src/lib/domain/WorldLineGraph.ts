import { StateRef, stateRefKey } from './StateRef';
import { WorldNode, createWorldNode } from './WorldNode';

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

  grow(changedRefs: StateRef[]): WorldLineGraph {
    const { nodes, rootNodeId } = this.state;
    const apex = this.getApex();

    if (!apex) {
      const worldLineId = generateWorldLineId();
      const newNode = createWorldNode(null, changedRefs, worldLineId);
      return new WorldLineGraph({
        nodes: { ...nodes, [newNode.id]: newNode },
        apexNodeId: newNode.id,
        rootNodeId: newNode.id,
      });
    }

    const childrenMap = this.getChildrenMap();
    const apexChildren = childrenMap[apex.id] ?? [];

    let worldLineId: string;
    if (apexChildren.length === 0) {
      worldLineId = apex.worldLineId;
    } else {
      worldLineId = generateWorldLineId();
    }

    const newNode = createWorldNode(apex.id, changedRefs, worldLineId);
    return new WorldLineGraph({
      nodes: { ...nodes, [newNode.id]: newNode },
      apexNodeId: newNode.id,
      rootNodeId,
    });
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

  getStateRefsAt(nodeId: string): StateRef[] {
    const path = this.getPathToNode(nodeId);
    const refMap = new Map<string, StateRef>();
    for (const node of path) {
      for (const ref of node.changedRefs) {
        refMap.set(stateRefKey(ref), ref);
      }
    }
    return Array.from(refMap.values());
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
