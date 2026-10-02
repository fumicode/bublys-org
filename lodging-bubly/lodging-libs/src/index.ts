// 自分の型と形を名乗る（副作用。`object-type-registration.ts` の註）
import "./object-type-registration.js";

// Domain
export * from './domain/Lodging.domain.js';
export * from './domain/lodgingSearch.js';
export * from './domain/foundLodgings.js';

// Slice（入れ物）
export * from './slice/lodging-slice.js';

// 調べ物（越後の宿）
export { ECHIGO as ECHIGO_LODGINGS } from './data/echigo-lodgings.js';

// UI
export { LodgingCard } from './ui/LodgingCard.js';
export { LodgingSearchBar } from './ui/LodgingSearchBar.js';
export { LodgingDetailView } from './ui/LodgingDetailView.js';

// Feature
export { LodgingDetail } from './feature/LodgingDetail.js';

// Registration（バブルルート）
export { lodgingBubbleRoutes } from './registration/bubbleRoutes.js';
