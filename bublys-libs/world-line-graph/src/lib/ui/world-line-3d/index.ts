// 世界線 3D ビューのサブバレル。
// ★ scene.ts は絶対にここから export しないこと。
//   export した瞬間に three が静的に見えるようになり、SSR・初期バンドル・
//   バブリの IIFE のすべてに three が入り込む（WorldLine3DView.tsx の説明を参照）。
export * from "./types.js";
export { buildSlotMap, type SlotMap } from "./slots.js";
export { foldCellStates, type CellState, type FoldResult } from "./cellStates.js";
export { assignLanes, type LaneAssignment } from "./lanes.js";
export {
  deriveScopeTree,
  defaultNestedScopeResolver,
  type NestedScopeResolver,
  type ScopeNode,
  type ScopeTree,
} from "./scopeTree.js";
export {
  computeWorldLine3DLayout,
  findViolations,
  cellOffset,
  type Layout3DInput,
} from "./layout3d.js";
export { PALETTE_3D, cellStyle, worldLineColor, type CellStyle } from "./palette3d.js";
export {
  ORBIT_PRESETS,
  applyDrag,
  applyWheel,
  clampOrbit,
  fitOrbit,
  orbitToPosition,
  wheelAction,
  MIN_DISTANCE,
  MAX_DISTANCE,
  PITCH_LIMIT,
  type Orbit,
  type WheelAction,
  type WheelInput,
} from "./camera.js";
export {
  isClick,
  ndcFromPointer,
  pickPlate,
  screenToRay,
  type Pick,
  type Ray,
} from "./picking.js";
export {
  paintPlate,
  plateCanvasSize,
  CELL_PX,
  HEADER_PX,
  type PaintOptions,
} from "./plateCanvas.js";
export {
  WorldLine3DView,
  type WorldLine3DViewProps,
  type Selection3D,
} from "./WorldLine3DView.js";
