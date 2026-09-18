/**
 * ui ── 平らな DOM を React で描く。値は1つも書かない（書くのは domain の動詞）。
 *
 * 正：docs/bubble-space-prototype/v4/RULES.md
 * 元：docs/bubble-space-prototype/v5-dom/lab.html の「描く所」（994-1096 行）
 */
export { FIELD_CSS } from './field-css.js';
export { drawField, markTiny, rowsOf, HEADER, MARK_MIN, DRAW_MIN } from './draw.js';
export type { BubbleDraw, HandleDraw, FieldDraw, DrawInput, MeasureText } from './draw.js';
export { measureTextInDom, forgetTextWidths } from './measure-text.js';
export { BubbleField, BubbleShell } from './BubbleField.js';
export type { BubbleFieldProps } from './BubbleField.js';
