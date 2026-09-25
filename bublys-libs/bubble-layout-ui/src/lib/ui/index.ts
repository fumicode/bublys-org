/**
 * ui ── 平らな DOM を React で描く／触る。値は1つも書かない（書くのは domain の動詞）。
 *
 * 正：docs/bubble-space-prototype/v4/RULES.md
 * 元：docs/bubble-space-prototype/v5-dom/lab.html の「描く所」と「触る所」
 */
export { FIELD_CSS, MARKS_CSS } from './field-css.js';
export { drawField, markTiny, rowsOf, HEADER, MARK_MIN, DRAW_MIN, CONTENT_MIN } from './draw.js';
export type { BandDraw, BandSpot, BubbleDraw, HandleDraw, FieldDraw, DrawInput, MeasureText } from './draw.js';
export { measureTextInDom, forgetTextWidths } from './measure-text.js';
// 帯（錐台）の形 ── 旧い海から持ってきた。どこから開いたかを描くのは新旧どちらも同じ形
export { frustumBand, cornerRadiusFor } from './link-band-path.js';
export type { BandRect, BandSide, FrustumBand } from './link-band-path.js';
export { BubbleField, BubbleShell, DropMarksView } from './BubbleField.js';
export type { BubbleFieldProps } from './BubbleField.js';

// ── 触る ──
export { pickAt, spaceAt, hitModelAt, spaceModelAt, inBox, inContent, onRing, onHandle, RING } from './hit.js';
export type { PickInput, Picked } from './hit.js';
export { withLift } from './lift.js';
export type { LiftState } from './lift.js';
export { useBubbleInput } from './useBubbleInput.js';
export type { BubbleInput, BubbleInputOptions, ClaimDropInfo } from './useBubbleInput.js';
