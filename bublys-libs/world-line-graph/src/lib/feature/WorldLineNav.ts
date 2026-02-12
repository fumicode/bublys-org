export type ForkPreview<T> = {
  readonly nodeId: string;
  readonly isSameLine: boolean;
  readonly preview: T;
  readonly onSelect: () => void;
};

export type WlNavProps<T = unknown> = {
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly forkPreviews: ForkPreview<T>[];
};
