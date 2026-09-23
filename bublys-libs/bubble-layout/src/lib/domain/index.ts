/**
 * domain ── 泡のならべかたの模型。React も Redux も DOM も入れない（CLAUDE.md）。
 *
 * 正：docs/bubble-space-prototype/v4/RULES.md
 * 元：docs/bubble-space-prototype/v5-dom/lab.html の「純粋な部分」（305-854 行と、§3 の値を書く所）
 *
 *   ① 泡の見え方は、その泡を入れている親の View で決まる      → view / dimension / arrange / lens
 *   ② 操作は、軸と、何を掴んだかで決まる                      → focus / drag / drop / reshape
 *   ③ 見えない親は、体を持たない                              → world（windowOf・rowOf）/ measure / reshape
 *   ④ 並べる＝帯の式                                          → arrange / measure
 *   ⑤ 触っていない泡は、画面の上で動かない                     → pin
 *
 * ★ 中身は入っている（`declare` はもう無い。この barrel を import すれば動く）。
 *   解決（値 → 画面の配置。dimension / lens / arrange / view / bubble / world / measure / resolve / project）は、
 *   ラボを headless Chromium で開いて出した配置と **px で突き合わせて差 0** を確かめてある
 *   ── 15 場面（起動直後・焦点をドラッグする・魚眼・プリセット・外から継ぐ・見えない親）× 58 個の泡、
 *   x・y・w・h・scale・local・alpha・vis・depth・描く順・空間ごとの H/vp/焦点 のぜんぶ。
 *   代表は `resolve.spec.ts`（`npx nx test bubble-layout`）。
 */

// ── 語彙 ──
export { ROOT_SPACE, METRICS, clamp } from './types.js';
export type { Axis, PlaneAxis, BubbleId, SpaceId, Size, Point, Rect, Vec3, Cell, Focus } from './types.js';

export { DEFAULT_RULES, resolveRules } from './rules.js';
export type { LayoutRules, EqualExtent, ZFocusStop } from './rules.js';

export { DIMENSIONS, verbOf, readDimension, maxHistIn, writeKeyOf } from './dimension.js';
export type { Dimension, DimensionId, Verb, WriteKey } from './dimension.js';

export { ARRANGES, arrangeAxis, valueFromPos, cellFromBands } from './arrange.js';
export type { ArrangeId, Align, Band, Arranged, ArrangeInput } from './arrange.js';

export { LENS_XY, LENS_Z, lensLabel, imageOf } from './lens.js';
export type { LensId, LensXyId, LensZId, LensXy, LensZ, Projected } from './lens.js';

export { PRESETS, presetView, snapView, viewOfSpace, fitArrange, withAxis, withPreset, withInheritedView } from './view.js';
export type { AxisView, View, ResolvedView, Preset, PresetId } from './view.js';

// ── 状態（クラス。更新は新しいインスタンス）──
export { Bubble } from './bubble.js';
export type { BubbleState, BubbleInit } from './bubble.js';
export { BubbleWorld, emptyWorld } from './world.js';
export type { WorldState, RootState } from './world.js';

// ── 解決（純関数。毎フレーム走る）──
export { headOf, padOf, measureBox, measureAll, halfOf, lensContext } from './measure.js';
export type { BoxSizes, LensContext } from './measure.js';
export { resolveWorld, compose, contentOf, contentRect, withFittedFocus } from './resolve.js';
export type { Layout, SpaceLayout, Placement, Host, Viewport } from './resolve.js';
export { unprojectLocal, screenToAxis, axisToScreen, focusFits, fitFocus, withFocusAxis, focusOf } from './project.js';

// ── 操作（値を書く。入力と当たり判定は ui）──
export { actContext } from './act.js';
export type { ActContext, ReshapeResult, SeenRect, SeenRects, ScreenRects } from './act.js';
export { focusOn, bringToCenter } from './focus.js';   // ② 触った泡へ視点が寄る（raise は消した）
export { dragVerbsOf, dragBubble, dragFocus, wheelZ, resizeBubble, liftsOf, movesOf } from './drag.js';
export type { DragVerbs, DragBubbleQuery, DragFocusQuery, ResizeQuery } from './drag.js';
export { dropTargetAt, spaceSlotAt, snapCandidateAt, spaceSummary } from './drop.js';
export type { DropQuery, DropTarget, DropSlot, DropMarks, OrderSlot, SnapTarget, Grabbed } from './drop.js';
export { reshape, commitDrop, applySnap, tidyRows, renumber, freeCellNear } from './reshape.js';
export type { ReshapeChange } from './reshape.js';
export { pin, keepSeen, anchorOf, withoutPin } from './pin.js';

// ── ラボと同じ場面（テストと見本が使う材料。規則ではない）──
// ★ もとは *.fixture.ts で、ライブラリの外に出していなかった。React 版とラボを突き合わせるとき、
//   両方が「同じ場面」から始まらないと px で比べられないので、ここから出すことにした。
export { labScene, VIEWPORT, LAB_ROOT_ORDER, LAB_SPACES } from './lab-scene.js';
