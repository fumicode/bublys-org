export interface StateRef {
  readonly type: string;
  readonly id: string;
  readonly hash: string;
}

export function stateRefKey(ref: StateRef): string {
  return `${ref.type}:${ref.id}`;
}

export function isSameObject(a: StateRef, b: StateRef): boolean {
  return a.type === b.type && a.id === b.id;
}

export function createStateRef(type: string, id: string, hash: string): StateRef {
  return { type, id, hash };
}
