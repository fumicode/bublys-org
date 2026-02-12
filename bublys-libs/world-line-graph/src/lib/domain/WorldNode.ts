import { StateRef } from './StateRef';

export interface WorldNode {
  readonly id: string;
  readonly parentId: string | null;
  readonly timestamp: number;
  readonly changedRefs: StateRef[];
  readonly worldLineId: string;
}

function generateNodeId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}`;
}

export function createWorldNode(
  parentId: string | null,
  changedRefs: StateRef[],
  worldLineId: string
): WorldNode {
  return {
    id: generateNodeId(),
    parentId,
    timestamp: Date.now(),
    changedRefs,
    worldLineId,
  };
}
