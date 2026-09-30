// 自分の型と形を名乗る（副作用）
import "./object-type-registration.js";

// Domain
export * from './domain/ItineraryItem.domain.js';
export * from './domain/Itinerary.domain.js';
export * from './domain/planLayout.js';

// Slice（入れ物）
export * from './slice/itinerary-slice.js';

// UI
export { ItineraryView, ITEM_CARD_HEIGHT } from './ui/ItineraryView.js';
export { ItineraryItemCard } from './ui/ItineraryItemCard.js';
export { ItineraryItemDetailView } from './ui/ItineraryItemDetailView.js';
export { ItineraryCard } from './ui/ItineraryCard.js';

// Feature
export { ItineraryDetail } from './feature/ItineraryDetail.js';
export { ItineraryItemCardBubble, ItineraryItemDetail } from './feature/ItineraryItemDetail.js';
export { ItineraryPlanSpace } from './feature/ItineraryPlanSpace.js';
export { useHandedPieces, type HandedPiece } from './feature/useHandedPieces.js';
export { useSeedItinerary, SAMPLE_ITINERARY_ID } from './feature/useSeedItinerary.js';

// Registration（バブルルート）
export { itineraryBubbleRoutes } from './registration/bubbleRoutes.js';
