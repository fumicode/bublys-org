/**
 * feature ── 世界を持ち、url を画面にし、開く。
 *
 * 正：docs/bubble-space-prototype/v4/RULES.md ／ 経緯：docs/bubble-space-prototype/DECISIONS.md
 */
export { BubbleSpace } from './BubbleSpace.js';
export type { BubbleSpaceProps, TakeOutInfo } from './BubbleSpace.js';
export { ObjectView } from './ObjectView.js';
export type { ObjectViewProps } from './ObjectView.js';
export {
  BubbleSpaceContext, CurrentBubbleContext, ScreenZoomContext, SelectedBubbleContext,
  useBubbleSpace, useCurrentBubble, useScreenZoom, useSelectedBubble,
} from './context.js';
export type { BubbleSpaceApi, ScreenZoom } from './context.js';
export { openAt, hueOf } from './openAt.js';
export type { OpenAtInput, OpenAtResult, OpenAs } from './openAt.js';
export {
  patternToRegex, extractParamNames, extractParams, matchesPattern,
  matchBubbleRoute, renderRoute, titleOf,
} from './routing.js';
export type { BubbleRoute, BubbleParams, RoutedBubble, BubbleContentRenderer } from './routing.js';
export { SPACE_CSS } from './space-css.js';
export { ListSpace, LIST_BOX, LIST_CARD_WIDTH, LIST_DEPTH_CARD_WIDTH, LayoutRoutesContext, LayoutRoutesProvider } from './ListSpace.js';
export type { ListSpaceProps } from './ListSpace.js';
