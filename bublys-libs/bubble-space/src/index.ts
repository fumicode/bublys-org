// ── domain（純粋な TypeScript。React も Redux も知らない） ──
export * from "./domain/geometry.js";
export * from "./domain/types.js";
export * from "./domain/anchor.js";
export * from "./domain/relation.js";
export * from "./domain/lens.js";
export * from "./domain/dimension.js";
export * from "./domain/view.js";
export * from "./domain/space.js";
export * from "./domain/solve.js";
export * from "./domain/resolve.js";
export * from "./domain/magnet.js";
export * from "./domain/snapshot.js";

// ── ui（解決済みの Placement を DOM に落とすだけ） ──
export * from "./ui/BubbleSpaceView.js";
export * from "./ui/ribbon-path.js";

// ── feature（状態と操作のオーケストレーション） ──
export * from "./feature/useBubbleSpace.js";
export * from "./feature/useSpaceWorldLine.js";
