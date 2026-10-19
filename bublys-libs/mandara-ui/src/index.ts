/**
 * @bublys-org/mandara-ui ── 曼荼羅UI。
 *
 * 魚眼の海は見渡すのが得意なかわりに、**指す**のが苦手になる
 * ── 遠い泡ほど小さく写るので、速く行きたい相手ほど的が小さい。
 * 曼荼羅は、泡ではなく**向き**を指せるようにして、そこを埋める。
 */
export type { Dir, Side, Rect, Line, Mandara } from './lib/domain/mandara.js';
export { DIRS, PAD, KEY, EDGE, sideOf, mandaraOf } from './lib/domain/mandara.js';

export type { Member, Placed, Placement } from './lib/domain/place.js';
export { MARGIN, placeOf } from './lib/domain/place.js';

export { MandaraGrid } from './lib/ui/MandaraGrid.js';
export type { MandaraGridProps } from './lib/ui/MandaraGrid.js';

export { MandaraModeContext, useMandaraMode, MandaraModeBubble } from './lib/feature/MandaraMode.js';
export type { MandaraMode } from './lib/feature/MandaraMode.js';
