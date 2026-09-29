// 自分の型と形を名乗る（副作用。`object-type-registration.ts` の註）
import "./object-type-registration.js";

// Domain
export * from './domain/Spot.domain.js';
export * from './domain/MapBounds.domain.js';
export * from './domain/hakoneGeography.js';

// Slice（入れ物）
export * from './slice/map-slice.js';

// UI
export { MapView } from './ui/MapView.js';
export { SpotCard } from './ui/SpotCard.js';

// Feature
export { MapBubble } from './feature/MapBubble.js';
export { SpotDetail } from './feature/SpotDetail.js';
export { useSeedSpots, HAKONE_SPOTS } from './feature/useSeedSpots.js';

// Registration（バブルルート）
export { mapBubbleRoutes } from './registration/bubbleRoutes.js';
